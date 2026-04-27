import type {
  DeleteShareFileOutput,
  ListSharesOutput,
  ShareDto,
  UploadShareOutput,
} from "@beacon/shared";

import {
  type IShareService,
  type ShareFileAsset,
  ShareService,
} from "./share.service";

export interface IShareController {
  deleteFile: (shareId: string) => Promise<DeleteShareFileOutput>;
  list: () => Promise<ListSharesOutput>;
  create: (input: unknown) => Promise<ShareDto>;
  upload: (input: unknown) => Promise<UploadShareOutput>;
  revoke: (shareId: string) => Promise<ShareDto>;
  download: (token: string) => Promise<Response>;
  previewStream: (
    token: string,
    rangeHeader: string | null,
    method: string,
  ) => Promise<Response>;
  previewText: (token: string) => Promise<Response>;
  previewThumbnail: (token: string) => Promise<Response>;
}

export class ShareController implements IShareController {
  constructor(private readonly service: IShareService = new ShareService()) {}

  async deleteFile(shareId: string): Promise<DeleteShareFileOutput> {
    return this.service.deleteShareFile({ shareId });
  }

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

  async previewStream(
    token: string,
    rangeHeader: string | null,
    method: string,
  ): Promise<Response> {
    const file = await this.service.getPreviewStreamAsset(token);

    return createStreamingFileResponse(file, rangeHeader, method === "HEAD");
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

function createStreamingFileResponse(
  file: ShareFileAsset,
  rangeHeader: string | null,
  isHeadRequest: boolean,
) {
  const fileSize = Number(file.sizeBytes);
  const baseHeaders = {
    "Accept-Ranges": "bytes",
    "Content-Disposition": createInlineDisposition(file.fileName),
    "Content-Type": file.mimeType,
  };

  if (!Number.isSafeInteger(fileSize)) {
    return createUnsatisfiableRangeResponse(file.sizeBytes.toString());
  }

  const range = parseByteRange(rangeHeader, fileSize);

  if (range === "invalid") {
    return createUnsatisfiableRangeResponse(file.sizeBytes.toString());
  }

  const source = Bun.file(file.absolutePath);

  if (!range) {
    return new Response(isHeadRequest ? null : source, {
      headers: {
        ...baseHeaders,
        "Content-Length": file.sizeBytes.toString(),
      },
    });
  }

  const contentLength = String(range.end - range.start + 1);

  return new Response(
    isHeadRequest ? null : source.slice(range.start, range.end + 1),
    {
      headers: {
        ...baseHeaders,
        "Content-Length": contentLength,
        "Content-Range": `bytes ${range.start}-${range.end}/${fileSize}`,
      },
      status: 206,
    },
  );
}

function createUnsatisfiableRangeResponse(sizeLabel: string) {
  return new Response(null, {
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes */${sizeLabel}`,
    },
    status: 416,
  });
}

function parseByteRange(
  rangeHeader: string | null,
  fileSize: number,
): { end: number; start: number } | "invalid" | null {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=([^,]+)$/.exec(rangeHeader.trim());

  if (!match) {
    return "invalid";
  }

  const rangeParts = match[1].split("-");

  if (rangeParts.length !== 2) {
    return "invalid";
  }

  const [startText, endText] = rangeParts;

  if (typeof endText === "undefined" || (!startText && !endText)) {
    return "invalid";
  }

  if (fileSize === 0) {
    return "invalid";
  }

  if (!startText) {
    const suffixLength = parsePositiveInteger(endText);

    if (!suffixLength) {
      return "invalid";
    }

    return {
      end: fileSize - 1,
      start: Math.max(fileSize - suffixLength, 0),
    };
  }

  const start = parseNonNegativeInteger(startText);
  const end = endText ? parseNonNegativeInteger(endText) : fileSize - 1;

  if (start === null || end === null || start > end || start >= fileSize) {
    return "invalid";
  }

  return {
    end: Math.min(end, fileSize - 1),
    start,
  };
}

function parseNonNegativeInteger(value: string) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePositiveInteger(value: string) {
  const parsed = parseNonNegativeInteger(value);

  return parsed && parsed > 0 ? parsed : null;
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
