import { existsSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
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

export interface ShareFileIntegration {
  resolveFile: (filePath: string) => Promise<ResolvedShareFile>;
  readFileBody: (filePath: string) => Promise<Blob>;
}

export class LocalShareFileIntegration implements ShareFileIntegration {
  private readonly roots = loadShareRoots();

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

  private isInsideShareRoot(absolutePath: string) {
    return this.roots.some((root) => {
      const rootPath = resolve(root.path);

      return (
        absolutePath === rootPath ||
        absolutePath.startsWith(`${rootPath}${sep}`)
      );
    });
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
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".txt": "text/plain; charset=utf-8",
    ".webp": "image/webp",
  };

  return mimeTypes[extension] ?? "application/octet-stream";
}
