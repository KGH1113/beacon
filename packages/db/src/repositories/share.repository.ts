import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  CreateShareInput,
  ShareDto,
  SharePreviewKind,
} from "@beacon/shared";

import { getPrismaClient } from "../client/prisma-client";

type PersistedShare = {
  id: string;
  token: string;
  filePath: string;
  fileName: string;
  sizeBytes: bigint | null;
  downloadCount: number;
  revokedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateShareRecordInput = CreateShareInput & {
  sizeBytes?: bigint | null;
};

export interface ShareRepository {
  list: () => Promise<ShareDto[]>;
  create: (input: CreateShareRecordInput) => Promise<ShareDto>;
  revoke: (shareId: string) => Promise<ShareDto | null>;
  findActiveByToken: (token: string) => Promise<ShareDto | null>;
  incrementDownloadCount: (shareId: string) => Promise<ShareDto | null>;
}

function toShareDto(share: PersistedShare): ShareDto {
  const extension = getFileExtension(share.fileName);

  return {
    id: share.id,
    token: share.token,
    filePath: share.filePath,
    fileName: share.fileName,
    sizeLabel: formatFileSize(share.sizeBytes),
    downloadCount: share.downloadCount,
    status: share.revokedAt ? "revoked" : "active",
    preview: {
      kind: getPreviewKind(extension),
      extension,
      thumbnailUrl: null,
      title: getPreviewTitle(share.fileName),
    },
    expiresAt: share.expiresAt?.toISOString() ?? null,
    createdAt: share.createdAt.toISOString(),
    updatedAt: share.updatedAt.toISOString(),
  };
}

export class PrismaShareRepository implements ShareRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

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
    const share = await this.prisma.share.findUnique({
      where: {
        token,
      },
    });

    if (!share || share.revokedAt) {
      return null;
    }

    return toShareDto(share);
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

  if (["avif", "gif", "jpeg", "jpg", "png", "webp"].includes(normalized)) {
    return "image";
  }

  if (["m4v", "mkv", "mov", "mp4", "webm"].includes(normalized)) {
    return "video";
  }

  if (["doc", "docx", "hwp", "pdf", "ppt", "pptx"].includes(normalized)) {
    return "document";
  }

  return "file";
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
