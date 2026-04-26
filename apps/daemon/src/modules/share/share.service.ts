import { type ShareRepository, createShareRepository } from "@beacon/db";
import {
  type CreateShareInput,
  CreateShareInputSchema,
  type ListSharesOutput,
  ListSharesOutputSchema,
  type RevokeShareInput,
  RevokeShareInputSchema,
  type ShareDto,
  ShareDtoSchema,
} from "@beacon/shared";

import {
  type ShareFileIntegration,
  createShareFileIntegration,
} from "../../integrations/share-files";
import { AppError } from "../../shared/errors/app-error";
import { ErrorCode } from "../../shared/errors/error-code";

export type ShareDownload = {
  body: Blob;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
};

export interface IShareService {
  listShares: () => Promise<ListSharesOutput>;
  createShare: (input: unknown) => Promise<ShareDto>;
  revokeShare: (input: unknown) => Promise<ShareDto>;
  getDownload: (token: string) => Promise<ShareDownload>;
}

export class ShareService implements IShareService {
  constructor(
    private readonly repository: ShareRepository = createShareRepository(),
    private readonly files: ShareFileIntegration = createShareFileIntegration(),
  ) {}

  async listShares(): Promise<ListSharesOutput> {
    const shares = await this.repository.list();

    return ListSharesOutputSchema.parse({ shares });
  }

  async createShare(input: unknown): Promise<ShareDto> {
    const parsed = CreateShareInputSchema.parse(
      input,
    ) satisfies CreateShareInput;
    const file = await this.files.resolveFile(parsed.filePath);
    const share = await this.repository.create({
      ...parsed,
      fileName: parsed.fileName || file.fileName,
      sizeBytes: file.sizeBytes,
    });

    return ShareDtoSchema.parse(share);
  }

  async revokeShare(input: unknown): Promise<ShareDto> {
    const parsed = RevokeShareInputSchema.parse(
      input,
    ) satisfies RevokeShareInput;
    const share = await this.repository.revoke(parsed.shareId);

    if (!share) {
      throw new AppError(ErrorCode.NotFound, "Share was not found.", 404);
    }

    return ShareDtoSchema.parse(share);
  }

  async getDownload(token: string): Promise<ShareDownload> {
    const share = await this.repository.findActiveByToken(token);

    if (!share) {
      throw new AppError(ErrorCode.NotFound, "Share was not found.", 404);
    }

    if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
      throw new AppError(ErrorCode.Gone, "Share has expired.", 410);
    }

    const file = await this.files.resolveFile(share.filePath);
    await this.repository.incrementDownloadCount(share.id);

    return {
      body: await this.files.readFileBody(share.filePath),
      fileName: share.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    };
  }
}
