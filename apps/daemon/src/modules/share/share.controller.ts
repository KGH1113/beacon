import type { ListSharesOutput, ShareDto } from "@beacon/shared";

import { type IShareService, ShareService } from "./share.service";

export interface IShareController {
  list: () => Promise<ListSharesOutput>;
  create: (input: unknown) => Promise<ShareDto>;
  revoke: (shareId: string) => Promise<ShareDto>;
  download: (token: string) => Promise<Response>;
}

export class ShareController implements IShareController {
  constructor(private readonly service: IShareService = new ShareService()) {}

  async list(): Promise<ListSharesOutput> {
    return this.service.listShares();
  }

  async create(input: unknown): Promise<ShareDto> {
    return this.service.createShare(input);
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
}

function createAttachmentDisposition(fileName: string) {
  const fallbackName = fileName.replace(/[^\w.-]/g, "_");
  const encodedName = encodeURIComponent(fileName);

  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
}
