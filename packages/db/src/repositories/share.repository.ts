import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  CreateShareInput,
  ShareDto,
  SharePreviewKind,
  SharePreviewStatus,
} from "@beacon/shared";

import { getPrismaClient } from "../client/prisma-client";

type PersistedShare = {
  id: string;
  token: string;
  filePath: string;
  fileName: string;
  sizeBytes: bigint | null;
  previewKind: string | null;
  previewStatus: string;
  thumbnailPath: string | null;
  streamPath: string | null;
  textPreviewPath: string | null;
  downloadCount: number;
  revokedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateShareRecordInput = CreateShareInput & {
  sizeBytes?: bigint | null;
};

export type SharePreviewRecordInput = {
  kind: SharePreviewKind;
  status: SharePreviewStatus;
  streamPath?: string | null;
  textPreviewPath?: string | null;
  thumbnailPath?: string | null;
};

export type ShareFileRecord = PersistedShare;

export interface ShareRepository {
  delete: (shareId: string) => Promise<ShareDto | null>;
  findRecordById: (shareId: string) => Promise<ShareFileRecord | null>;
  list: () => Promise<ShareDto[]>;
  create: (input: CreateShareRecordInput) => Promise<ShareDto>;
  revoke: (shareId: string) => Promise<ShareDto | null>;
  findActiveByToken: (token: string) => Promise<ShareDto | null>;
  findActiveRecordByToken: (token: string) => Promise<ShareFileRecord | null>;
  incrementDownloadCount: (shareId: string) => Promise<ShareDto | null>;
  updatePreview: (
    shareId: string,
    input: SharePreviewRecordInput,
  ) => Promise<ShareDto | null>;
}

function toShareDto(share: PersistedShare): ShareDto {
  const extension = getFileExtension(share.fileName);
  const previewKind = parsePreviewKind(share.previewKind, extension);
  const previewStatus = parsePreviewStatus(share.previewStatus);

  return {
    id: share.id,
    token: share.token,
    filePath: share.filePath,
    fileName: share.fileName,
    sizeLabel: formatFileSize(share.sizeBytes),
    downloadCount: share.downloadCount,
    status: share.revokedAt ? "revoked" : "active",
    preview: {
      kind: previewKind,
      status: previewStatus,
      extension,
      thumbnailUrl: share.thumbnailPath
        ? `/preview/${share.token}/thumbnail`
        : null,
      streamUrl: share.streamPath ? `/stream/${share.token}` : null,
      textPreviewUrl: share.textPreviewPath
        ? `/preview/${share.token}/text`
        : null,
      title: getPreviewTitle(share.fileName),
    },
    expiresAt: share.expiresAt?.toISOString() ?? null,
    createdAt: share.createdAt.toISOString(),
    updatedAt: share.updatedAt.toISOString(),
  };
}

export class PrismaShareRepository implements ShareRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async delete(shareId: string): Promise<ShareDto | null> {
    try {
      const share = await this.prisma.share.delete({
        where: {
          id: shareId,
        },
      });

      return toShareDto(share);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async findRecordById(shareId: string): Promise<ShareFileRecord | null> {
    return this.prisma.share.findUnique({
      where: {
        id: shareId,
      },
    });
  }

  async list(): Promise<ShareDto[]> {
    const shares = await this.prisma.share.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return shares.map(toShareDto);
  }

  async create(input: CreateShareRecordInput): Promise<ShareDto> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const share = await this.prisma.share.create({
          data: {
            token: createShareToken(),
            filePath: input.filePath,
            fileName: input.fileName,
            sizeBytes: input.sizeBytes ?? null,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          },
        });

        return toShareDto(share);
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    throw new Error("Failed to generate a unique share token.");
  }

  async revoke(shareId: string): Promise<ShareDto | null> {
    try {
      const share = await this.prisma.share.update({
        where: {
          id: shareId,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return toShareDto(share);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async findActiveByToken(token: string): Promise<ShareDto | null> {
    const share = await this.findActiveRecordByToken(token);

    return share ? toShareDto(share) : null;
  }

  async findActiveRecordByToken(
    token: string,
  ): Promise<ShareFileRecord | null> {
    const share = await this.prisma.share.findUnique({
      where: {
        token,
      },
    });

    if (!share || share.revokedAt) {
      return null;
    }

    return share;
  }

  async incrementDownloadCount(shareId: string): Promise<ShareDto | null> {
    try {
      const share = await this.prisma.share.update({
        where: {
          id: shareId,
        },
        data: {
          downloadCount: {
            increment: 1,
          },
        },
      });

      return toShareDto(share);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async updatePreview(
    shareId: string,
    input: SharePreviewRecordInput,
  ): Promise<ShareDto | null> {
    try {
      const share = await this.prisma.share.update({
        where: {
          id: shareId,
        },
        data: {
          previewKind: input.kind,
          previewStatus: input.status,
          streamPath: input.streamPath ?? null,
          textPreviewPath: input.textPreviewPath ?? null,
          thumbnailPath: input.thumbnailPath ?? null,
        },
      });

      return toShareDto(share);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }
}

export function createShareRepository(): ShareRepository {
  return new PrismaShareRepository();
}

function createShareToken() {
  return `share_${randomBytes(12).toString("base64url")}`;
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isRecordNotFoundError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

function getPreviewTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function getPreviewKind(extension: string): SharePreviewKind {
  const normalized = extension.toLowerCase();

  if (["aac", "flac", "m4a", "mp3", "ogg", "wav"].includes(normalized)) {
    return "audio";
  }

  if (["avif", "gif", "jpeg", "jpg", "png", "webp"].includes(normalized)) {
    return "image";
  }

  if (["log", "md", "txt"].includes(normalized)) {
    return "text";
  }

  if (["m4v", "mkv", "mov", "mp4", "webm"].includes(normalized)) {
    return "video";
  }

  if (["doc", "docx", "hwp", "pdf", "ppt", "pptx"].includes(normalized)) {
    return "document";
  }

  return "file";
}

function parsePreviewKind(
  value: string | null,
  fallbackExtension: string,
): SharePreviewKind {
  if (
    value === "audio" ||
    value === "document" ||
    value === "file" ||
    value === "image" ||
    value === "text" ||
    value === "video"
  ) {
    return value;
  }

  return getPreviewKind(fallbackExtension);
}

function parsePreviewStatus(value: string): SharePreviewStatus {
  return value === "ready" ? "ready" : "unavailable";
}

function formatFileSize(sizeBytes: bigint | null) {
  if (sizeBytes === null) {
    return "Unknown";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(sizeBytes);
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formatted =
    value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);

  return `${formatted} ${units[unitIndex]}`;
}
