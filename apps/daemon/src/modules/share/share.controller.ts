import type {
  DeleteShareFileOutput,
  ListSharesOutput,
  ShareDto,
  ShareRealtimeEventDto,
  UploadShareOutput,
} from "@beacon/shared";

import {
  type ShareRealtimeBroadcaster,
  shareRealtimeBroadcaster,
} from "./share.realtime";
import {
  type IShareService,
  type ShareFileAsset,
  ShareService,
} from "./share.service";

const shareStreamHeartbeatIntervalMs = 25_000;

export interface IShareController {
  deleteFile: (shareId: string) => Promise<DeleteShareFileOutput>;
  list: () => Promise<ListSharesOutput>;
  create: (input: unknown) => Promise<ShareDto>;
  upload: (input: unknown) => Promise<UploadShareOutput>;
  revoke: (shareId: string) => Promise<ShareDto>;
  stream: (signal: AbortSignal) => Response;
  download: (token: string) => Promise<Response>;
  previewStream: (
    token: string,
    rangeHeader: string | null,
  ) => Promise<Response>;
  previewStreamHead: (
    token: string,
    rangeHeader: string | null,
  ) => Promise<StreamHeadResponse>;
  previewText: (token: string) => Promise<Response>;
  previewThumbnail: (token: string) => Promise<Response>;
}

type StreamHeadResponse = {
  headers: Record<string, string>;
  status: number;
};

export class ShareController implements IShareController {
  constructor(
    private readonly service: IShareService = new ShareService(),
    private readonly realtime: ShareRealtimeBroadcaster = shareRealtimeBroadcaster,
  ) {}

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

  stream(signal: AbortSignal): Response {
    const encoder = new TextEncoder();
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let unsubscribe: (() => void) | undefined;
    let isClosed = false;

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const close = () => {
          if (isClosed) {
            return;
          }

          isClosed = true;
          unsubscribe?.();

          if (heartbeat) {
            clearInterval(heartbeat);
          }

          controller.close();
        };

        const sendEvent = (event: ShareRealtimeEventDto) => {
          if (isClosed) {
            return;
          }

          controller.enqueue(encoder.encode(formatSseEvent(event)));
        };

        const sendSnapshot = async () => {
          try {
            const snapshot = await this.service.listShares();

            sendEvent({
              type: "share.snapshot",
              timestamp: new Date().toISOString(),
              payload: snapshot,
            });
          } catch {
            if (!isClosed) {
              controller.enqueue(
                encoder.encode(
                  [
                    "event: share.error",
                    `data: ${JSON.stringify({
                      message: "Failed to list shares.",
                      timestamp: new Date().toISOString(),
                    })}`,
                    "",
                    "",
                  ].join("\n"),
                ),
              );
            }
          }
        };

        unsubscribe = this.realtime.subscribe(sendEvent);
        signal.addEventListener("abort", close, { once: true });
        void sendSnapshot();
        heartbeat = setInterval(() => {
          if (!isClosed) {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }
        }, shareStreamHeartbeatIntervalMs);
      },
      cancel: () => {
        isClosed = true;
        unsubscribe?.();

        if (heartbeat) {
          clearInterval(heartbeat);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
      },
    });
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
  ): Promise<Response> {
    const file = await this.service.getPreviewStreamAsset(token);

    return createStreamingFileResponse(file, rangeHeader);
  }

  async previewStreamHead(
    token: string,
    rangeHeader: string | null,
  ): Promise<StreamHeadResponse> {
    const file = await this.service.getPreviewStreamAsset(token);
    const response = createStreamingFileResponse(file, rangeHeader);

    return {
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
    };
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

function formatSseEvent(event: ShareRealtimeEventDto): string {
  return [
    `event: ${event.type}`,
    `data: ${JSON.stringify(event)}`,
    "",
    "",
  ].join("\n");
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
    return new Response(source, {
      headers: {
        ...baseHeaders,
        "Content-Length": file.sizeBytes.toString(),
      },
    });
  }

  const contentLength = String(range.end - range.start + 1);

  return new Response(source.slice(range.start, range.end + 1), {
    headers: {
      ...baseHeaders,
      "Content-Length": contentLength,
      "Content-Range": `bytes ${range.start}-${range.end}/${fileSize}`,
    },
    status: 206,
  });
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
