import { open, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { SharePreviewKind, SharePreviewStatus } from "@beacon/shared";
import sharp from "sharp";

import type { ShareFileIntegration } from "./share-files";

const TEXT_PREVIEW_BYTES = 64 * 1024;
const TEXT_PREVIEW_CHARACTERS = 4000;

export type SharePreviewArtifacts = {
  kind: SharePreviewKind;
  status: SharePreviewStatus;
  streamPath?: string | null;
  textPreviewPath?: string | null;
  thumbnailPath?: string | null;
};

export type SharePreviewSource = {
  fileName: string;
  filePath: string;
  shareId: string;
};

export interface SharePreviewIntegration {
  generatePreview: (
    source: SharePreviewSource,
  ) => Promise<SharePreviewArtifacts>;
}

export class LocalSharePreviewIntegration implements SharePreviewIntegration {
  constructor(private readonly files: ShareFileIntegration) {}

  async generatePreview(
    source: SharePreviewSource,
  ): Promise<SharePreviewArtifacts> {
    const kind = getPreviewKind(source.fileName);

    try {
      const previewDir = await this.files.createPreviewDirectory(
        source.shareId,
      );
      const sourceFile = await this.files.resolveFile(source.filePath);

      if (kind === "image") {
        const thumbnailPath = join(previewDir, "thumbnail.webp");
        await sharp(sourceFile.absolutePath)
          .resize({
            fit: "inside",
            height: 960,
            width: 960,
            withoutEnlargement: true,
          })
          .webp({ quality: 78 })
          .toFile(thumbnailPath);

        return {
          kind,
          status: "ready",
          thumbnailPath,
        };
      }

      if (kind === "text") {
        const textPreviewPath = join(previewDir, "preview.txt");
        await writeFile(
          textPreviewPath,
          await createTextPreview(sourceFile.absolutePath),
          "utf-8",
        );

        return {
          kind,
          status: "ready",
          textPreviewPath,
        };
      }

      if (kind === "video") {
        const thumbnailPath = join(previewDir, "thumbnail.jpg");
        const streamPath = join(previewDir, "stream.mp4");
        await runFfmpeg([
          "-y",
          "-ss",
          "00:00:00",
          "-i",
          sourceFile.absolutePath,
          "-frames:v",
          "1",
          "-vf",
          "scale=960:-2:force_original_aspect_ratio=decrease",
          thumbnailPath,
        ]);
        await runFfmpeg([
          "-y",
          "-i",
          sourceFile.absolutePath,
          "-vf",
          "scale=960:-2:force_original_aspect_ratio=decrease",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "28",
          "-c:a",
          "aac",
          "-b:a",
          "96k",
          "-movflags",
          "+faststart",
          streamPath,
        ]);

        return {
          kind,
          status: "ready",
          streamPath,
          thumbnailPath,
        };
      }

      if (kind === "audio") {
        const streamPath = join(previewDir, "stream.m4a");
        await runFfmpeg([
          "-y",
          "-i",
          sourceFile.absolutePath,
          "-vn",
          "-c:a",
          "aac",
          "-b:a",
          "96k",
          streamPath,
        ]);

        return {
          kind,
          status: "ready",
          streamPath,
        };
      }

      return {
        kind,
        status: "unavailable",
      };
    } catch {
      return {
        kind,
        status: "unavailable",
      };
    }
  }
}

export function createSharePreviewIntegration(
  files: ShareFileIntegration,
): SharePreviewIntegration {
  return new LocalSharePreviewIntegration(files);
}

async function createTextPreview(filePath: string) {
  const handle = await open(filePath, "r");

  try {
    const buffer = Buffer.alloc(TEXT_PREVIEW_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, TEXT_PREVIEW_BYTES, 0);
    const text = buffer.subarray(0, bytesRead).toString("utf-8");
    const normalized = text.replace(/\0/g, "").trimEnd();

    return normalized.slice(0, TEXT_PREVIEW_CHARACTERS);
  } finally {
    await handle.close();
  }
}

async function runFfmpeg(args: string[]) {
  const process = Bun.spawn(["ffmpeg", ...args], {
    stderr: "pipe",
    stdout: "ignore",
  });
  const exitCode = await process.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(process.stderr).text();

    throw new Error(stderr || `ffmpeg exited with code ${exitCode}`);
  }
}

function getPreviewKind(fileName: string): SharePreviewKind {
  const extension = extname(fileName).toLowerCase();

  if ([".aac", ".flac", ".m4a", ".mp3", ".ogg", ".wav"].includes(extension)) {
    return "audio";
  }

  if ([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"].includes(extension)) {
    return "image";
  }

  if ([".log", ".md", ".txt"].includes(extension)) {
    return "text";
  }

  if ([".m4v", ".mkv", ".mov", ".mp4", ".webm"].includes(extension)) {
    return "video";
  }

  if ([".doc", ".docx", ".hwp", ".pdf", ".ppt", ".pptx"].includes(extension)) {
    return "document";
  }

  return "file";
}
