import type { PrismaClient } from "@prisma/client";

import type { CreateShareInput, ShareDto } from "@beacon/shared";

import { getPrismaClient } from "../client/prisma-client";

export interface ShareRepository {
  list: () => Promise<ShareDto[]>;
  create: (input: CreateShareInput) => Promise<ShareDto>;
}

export class PrismaShareRepository implements ShareRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async list(): Promise<ShareDto[]> {
    const shares = await this.prisma.share.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return shares.map((share) => ({
      id: share.id,
      token: share.token,
      filePath: share.filePath,
      fileName: share.fileName,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      createdAt: share.createdAt.toISOString(),
      updatedAt: share.updatedAt.toISOString(),
    }));
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

    return {
      id: share.id,
      token: share.token,
      filePath: share.filePath,
      fileName: share.fileName,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      createdAt: share.createdAt.toISOString(),
      updatedAt: share.updatedAt.toISOString(),
    };
  }
}

export function createShareRepository(): ShareRepository {
  return new PrismaShareRepository();
}
