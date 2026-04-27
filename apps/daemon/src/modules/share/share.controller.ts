import type {
  ListSharesOutput,
  ShareDto,
  UploadShareOutput,
} from "@beacon/shared";

import { type IShareService, ShareService } from "./share.service";

export interface IShareController {
  list: () => Promise<ListSharesOutput>;
  create: (input: unknown) => Promise<ShareDto>;
  upload: (input: unknown) => Promise<UploadShareOutput>;
  revoke: (shareId: string) => Promise<ShareDto>;
  download: (token: string) => Promise<Response>;
  previewStream: (token: string) => Promise<Response>;
  previewText: (token: string) => Promise<Response>;
  previewThumbnail: (token: string) => Promise<Response>;
}

export class ShareController implements IShareController {
  constructor(private readonly service: IShareService = new ShareService()) {}

  async list(): Promise<ListSharesOutput> {
    return this.service.listShares();
  }

  async create(input: unknown): Promise<ShareDto> {
    return this.service.createShare(input);
  }

  async upload(input: unknown): Promise<UploadShareOutput> {
    return this.service.uploadShare(input);
  }

  async revoke(shareId: string): Promise<ShareDto> {
    return this.service.revokeShare({ shareId });
  }

  async download(token: string): Promise<Response> {
    const file = await this.service.getDownload(token);

    return new Response(file.body, {
      headers: {
        "Content-Disposition": createAttachmentDisposition(file.fileName),
        "Content-Length": file.sizeBytes.toString(),
        "Content-Type": file.mimeType,
      },
    });
  }

  async previewStream(token: string): Promise<Response> {
    const file = await this.service.getPreviewAsset(token, "stream");

    return createInlineFileResponse(file);
  }

  async previewText(token: string): Promise<Response> {
    const file = await this.service.getPreviewAsset(token, "text");

    return createInlineFileResponse(file);
  }

  async previewThumbnail(token: string): Promise<Response> {
    const file = await this.service.getPreviewAsset(token, "thumbnail");

    return createInlineFileResponse(file);
  }
}

function createInlineFileResponse(file: {
  body: Blob;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
}) {
  return new Response(file.body, {
    headers: {
      "Content-Disposition": createInlineDisposition(file.fileName),
      "Content-Length": file.sizeBytes.toString(),
      "Content-Type": file.mimeType,
    },
  });
}

function createAttachmentDisposition(fileName: string) {
  const fallbackName = fileName.replace(/[^\w.-]/g, "_");
  const encodedName = encodeURIComponent(fileName);

  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
}

function createInlineDisposition(fileName: string) {
  const fallbackName = fileName.replace(/[^\w.-]/g, "_");
  const encodedName = encodeURIComponent(fileName);

  return `inline; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
}
