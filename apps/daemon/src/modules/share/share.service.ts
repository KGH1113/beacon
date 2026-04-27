import {
  type ShareFileRecord,
  type ShareRepository,
  createShareRepository,
} from "@beacon/db";
import {
  type CreateShareInput,
  CreateShareInputSchema,
  type DeleteShareFileInput,
  DeleteShareFileInputSchema,
  type DeleteShareFileOutput,
  DeleteShareFileOutputSchema,
  type ListSharesOutput,
  ListSharesOutputSchema,
  type RevokeShareInput,
  RevokeShareInputSchema,
  type ShareDto,
  ShareDtoSchema,
  UploadShareMetadataSchema,
  type UploadShareOutput,
  UploadShareOutputSchema,
} from "@beacon/shared";

import {
  type ShareFileIntegration,
  createShareFileIntegration,
} from "../../integrations/share-files";
import {
  type SharePreviewIntegration,
  createSharePreviewIntegration,
} from "../../integrations/share-previews";
import { AppError } from "../../shared/errors/app-error";
import { ErrorCode } from "../../shared/errors/error-code";

export type ShareDownload = {
  absolutePath: string;
  body: Blob;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
};

export type ShareFileAsset = Omit<ShareDownload, "body">;

export type SharePreviewAssetType = "stream" | "text" | "thumbnail";

export interface IShareService {
  deleteShareFile: (input: unknown) => Promise<DeleteShareFileOutput>;
  listShares: () => Promise<ListSharesOutput>;
  createShare: (input: unknown) => Promise<ShareDto>;
  uploadShare: (input: unknown) => Promise<UploadShareOutput>;
  revokeShare: (input: unknown) => Promise<ShareDto>;
  getDownload: (token: string) => Promise<ShareDownload>;
  getPreviewAsset: (
    token: string,
    type: SharePreviewAssetType,
  ) => Promise<ShareDownload>;
  getPreviewStreamAsset: (token: string) => Promise<ShareFileAsset>;
}

export class ShareService implements IShareService {
  constructor(
    private readonly repository: ShareRepository = createShareRepository(),
    private readonly files: ShareFileIntegration = createShareFileIntegration(),
    private readonly previews: SharePreviewIntegration = createSharePreviewIntegration(
      files,
    ),
  ) {}

  async deleteShareFile(input: unknown): Promise<DeleteShareFileOutput> {
    const parsed = DeleteShareFileInputSchema.parse(
      input,
    ) satisfies DeleteShareFileInput;
    const share = await this.repository.findRecordById(parsed.shareId);

    if (!share) {
      throw new AppError(ErrorCode.NotFound, "Share was not found.", 404);
    }

    await this.files.deleteSharedFile(share.filePath);
    await this.files.deletePreviewDirectory(share.id);
    await this.repository.delete(share.id);

    return DeleteShareFileOutputSchema.parse({
      shareId: share.id,
    });
  }

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
    const updatedShare = await this.generateAndPersistPreview(
      share,
      file.absolutePath,
    );

    return ShareDtoSchema.parse(updatedShare);
  }

  async uploadShare(input: unknown): Promise<UploadShareOutput> {
    const upload = parseUploadBody(input);
    const metadata = UploadShareMetadataSchema.parse({
      expiresAt: upload.expiresAt,
    });
    const file = await this.files.storeUploadedFile(upload.file);
    const share = await this.repository.create({
      expiresAt: metadata.expiresAt ?? getDefaultShareExpiry(),
      fileName: file.fileName,
      filePath: file.absolutePath,
      sizeBytes: file.sizeBytes,
    });
    const updatedShare = await this.generateAndPersistPreview(
      share,
      file.absolutePath,
    );

    return UploadShareOutputSchema.parse({ share: updatedShare });
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
    const share = await this.getActiveShareRecord(token);
    const file = await this.files.resolveFile(share.filePath);
    await this.repository.incrementDownloadCount(share.id);

    return {
      absolutePath: file.absolutePath,
      body: await this.files.readFileBody(share.filePath),
      fileName: share.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    };
  }

  async getPreviewAsset(
    token: string,
    type: SharePreviewAssetType,
  ): Promise<ShareDownload> {
    const file = await this.getPreviewFileAsset(token, type);

    return {
      ...file,
      body: await this.files.readFileBody(file.absolutePath),
    };
  }

  async getPreviewStreamAsset(token: string): Promise<ShareFileAsset> {
    return this.getPreviewFileAsset(token, "stream");
  }

  private async getPreviewFileAsset(
    token: string,
    type: SharePreviewAssetType,
  ): Promise<ShareFileAsset> {
    const share = await this.getActiveShareRecord(token);
    const filePath = getPreviewPath(share, type);

    if (!filePath) {
      throw new AppError(ErrorCode.NotFound, "Preview was not found.", 404);
    }

    const file = await this.files.resolveFile(filePath);

    return {
      absolutePath: file.absolutePath,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    };
  }

  private async generateAndPersistPreview(
    share: ShareDto,
    filePath: string,
  ): Promise<ShareDto> {
    const preview = await this.previews.generatePreview({
      fileName: share.fileName,
      filePath,
      shareId: share.id,
    });
    const updatedShare = await this.repository.updatePreview(share.id, preview);

    return updatedShare ?? share;
  }

  private async getActiveShareRecord(token: string): Promise<ShareFileRecord> {
    const share = await this.repository.findActiveRecordByToken(token);

    if (!share) {
      throw new AppError(ErrorCode.NotFound, "Share was not found.", 404);
    }

    if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
      throw new AppError(ErrorCode.Gone, "Share has expired.", 410);
    }

    return share;
  }
}

function getPreviewPath(share: ShareFileRecord, type: SharePreviewAssetType) {
  if (type === "stream") {
    return share.streamPath;
  }

  if (type === "text") {
    return share.textPreviewPath;
  }

  return share.thumbnailPath;
}

function parseUploadBody(input: unknown) {
  if (!isRecord(input)) {
    throw new AppError(
      ErrorCode.ValidationFailed,
      "Invalid upload request.",
      400,
    );
  }

  const file = normalizeUploadFile(input.file);

  if (!file) {
    throw new AppError(
      ErrorCode.ValidationFailed,
      "Upload file is required.",
      400,
    );
  }

  return {
    expiresAt: typeof input.expiresAt === "string" ? input.expiresAt : null,
    file,
  };
}

function normalizeUploadFile(value: unknown): File | null {
  if (value instanceof File) {
    return value;
  }

  if (Array.isArray(value) && value[0] instanceof File) {
    return value[0];
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getDefaultShareExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return expiresAt.toISOString();
}
