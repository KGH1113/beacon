import type { PrismaClient } from "@prisma/client";

import type { CreateShareInput, ShareDto } from "@beacon/shared";

import { getPrismaClient } from "../client/prisma-client";

type PersistedShare = {
  id: string;
  token: string;
  filePath: string;
  fileName: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface ShareRepository {
  list: () => Promise<ShareDto[]>;
  create: (input: CreateShareInput) => Promise<ShareDto>;
}

function toShareDto(share: PersistedShare): ShareDto {
  return {
    id: share.id,
    token: share.token,
    filePath: share.filePath,
    fileName: share.fileName,
    sizeLabel: "Unknown",
    downloadCount: 0,
    status: "active",
    preview: {
      kind: "file",
      extension: share.fileName.split(".").pop()?.toUpperCase() ?? "FILE",
      thumbnailUrl: null,
      title: share.fileName,
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

  async create(input: CreateShareInput): Promise<ShareDto> {
    const share = await this.prisma.share.create({
      data: {
        token: "placeholder-token",
        filePath: input.filePath,
        fileName: input.fileName,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    return toShareDto(share);
  }
}

export function createShareRepository(): ShareRepository {
  return new PrismaShareRepository();
}
