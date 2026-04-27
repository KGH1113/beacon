import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { basename, extname, resolve, sep } from "node:path";
import { z } from "zod";

import { AppError } from "../shared/errors/app-error";
import { ErrorCode } from "../shared/errors/error-code";

const ShareRootSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string().min(1),
});

const ShareRootsSchema = z.array(ShareRootSchema).min(1);

export type ResolvedShareFile = {
  absolutePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
};

export type StoredUploadedShareFile = ResolvedShareFile & {
  originalFileName: string;
};

export interface ShareFileIntegration {
  createPreviewDirectory: (shareId: string) => Promise<string>;
  resolveFile: (filePath: string) => Promise<ResolvedShareFile>;
  readFileBody: (filePath: string) => Promise<Blob>;
  storeUploadedFile: (file: File) => Promise<StoredUploadedShareFile>;
}

export class LocalShareFileIntegration implements ShareFileIntegration {
  private readonly roots = loadShareRoots();

  async createPreviewDirectory(shareId: string): Promise<string> {
    const previewDir = resolve(
      this.roots[0].path,
      ".beacon",
      "previews",
      shareId,
    );

    if (!this.isInsideShareRoot(previewDir)) {
      throw new AppError(
        ErrorCode.Forbidden,
        "Preview destination is outside configured share roots.",
        403,
      );
    }

    await mkdir(previewDir, { recursive: true });

    return previewDir;
  }

  async resolveFile(filePath: string): Promise<ResolvedShareFile> {
    const absolutePath = resolve(filePath);

    if (!this.isInsideShareRoot(absolutePath)) {
      throw new AppError(
        ErrorCode.Forbidden,
        "File is outside configured share roots.",
        403,
      );
    }

    let fileStat: Awaited<ReturnType<typeof stat>>;

    try {
      fileStat = await stat(absolutePath);
    } catch {
      throw new AppError(ErrorCode.NotFound, "Shared file was not found.", 404);
    }

    if (!fileStat.isFile()) {
      throw new AppError(ErrorCode.Forbidden, "Only files can be shared.", 403);
    }

    return {
      absolutePath,
      fileName: basename(absolutePath),
      mimeType: getMimeType(absolutePath),
      sizeBytes: BigInt(fileStat.size),
    };
  }

  async readFileBody(filePath: string): Promise<Blob> {
    const file = await this.resolveFile(filePath);
    const bytes = await readFile(file.absolutePath);

    return new Blob([bytes], {
      type: file.mimeType,
    });
  }

  async storeUploadedFile(file: File): Promise<StoredUploadedShareFile> {
    const originalFileName = sanitizeFileName(file.name || "upload.bin");
    const uploadDir = this.getUploadDirectory();
    await mkdir(uploadDir, { recursive: true });

    const storedFileName = `${randomUUID()}-${originalFileName}`;
    const absolutePath = resolve(uploadDir, storedFileName);

    if (!this.isInsideShareRoot(absolutePath)) {
      throw new AppError(
        ErrorCode.Forbidden,
        "Upload destination is outside configured share roots.",
        403,
      );
    }

    await Bun.write(absolutePath, file);
    const resolvedFile = await this.resolveFile(absolutePath);

    return {
      ...resolvedFile,
      fileName: originalFileName,
      originalFileName,
    };
  }

  private isInsideShareRoot(absolutePath: string) {
    return this.roots.some((root) => {
      const rootPath = resolve(root.path);

      return (
        absolutePath === rootPath ||
        absolutePath.startsWith(`${rootPath}${sep}`)
      );
    });
  }

  private getUploadDirectory() {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return resolve(this.roots[0].path, "uploads", year, month, day);
  }
}

export function createShareFileIntegration(): ShareFileIntegration {
  return new LocalShareFileIntegration();
}

function loadShareRoots() {
  const sourcePath = findShareRootsConfigPath();
  const contents = readFileSync(sourcePath, "utf-8");

  return ShareRootsSchema.parse(JSON.parse(contents));
}

function findShareRootsConfigPath() {
  if (process.env.BEACON_SHARE_ROOTS_CONFIG) {
    return resolve(process.env.BEACON_SHARE_ROOTS_CONFIG);
  }

  const candidates = [
    resolve(process.cwd(), "config/share-roots.json"),
    resolve(process.cwd(), "config/share-roots.example.json"),
    resolve(process.cwd(), "../../config/share-roots.json"),
    resolve(process.cwd(), "../../config/share-roots.example.json"),
  ];

  const configPath = candidates.find((candidate) => existsSync(candidate));

  if (!configPath) {
    throw new AppError(
      ErrorCode.NotFound,
      "Share roots config was not found.",
      500,
    );
  }

  return configPath;
}

function getMimeType(filePath: string) {
  const extension = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".avif": "image/avif",
    ".flac": "audio/flac",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".m4a": "audio/mp4",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".ogg": "audio/ogg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".txt": "text/plain; charset=utf-8",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".webp": "image/webp",
  };

  return mimeTypes[extension] ?? "application/octet-stream";
}

function sanitizeFileName(fileName: string) {
  const sanitized = Array.from(basename(fileName))
    .map((character) =>
      isUnsafeFileNameCharacter(character) ? "_" : character,
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || "upload.bin";
}

function isUnsafeFileNameCharacter(character: string) {
  const code = character.charCodeAt(0);

  return code < 32 || code === 127 || '/\\?%*:|"<>'.includes(character);
}
