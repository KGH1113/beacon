import type {
  GetSystemOverviewOutput,
  SystemOverviewRealtimeEventDto,
} from "@beacon/shared";

import { type ISystemService, SystemService } from "./system.service";

const systemOverviewStreamIntervalMs = 5_000;

export interface ISystemController {
  getOverview: () => Promise<GetSystemOverviewOutput>;
  streamOverview: (signal: AbortSignal) => Response;
}

export class SystemController implements ISystemController {
  constructor(private readonly service: ISystemService = new SystemService()) {}

  async getOverview(): Promise<GetSystemOverviewOutput> {
    return this.service.getOverview();
  }

  streamOverview(signal: AbortSignal): Response {
    const encoder = new TextEncoder();
    let interval: ReturnType<typeof setInterval> | undefined;
    let isClosed = false;

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const close = () => {
          if (isClosed) {
            return;
          }

          isClosed = true;

          if (interval) {
            clearInterval(interval);
          }

          controller.close();
        };

        const send = async () => {
          if (isClosed) {
            return;
          }

          try {
            const event = await this.service.getOverviewRealtimeEvent();

            if (isClosed) {
              return;
            }

            controller.enqueue(encoder.encode(formatSseEvent(event)));
          } catch {
            if (isClosed) {
              return;
            }

            controller.enqueue(
              encoder.encode(
                [
                  "event: system.error",
                  `data: ${JSON.stringify({
                    message: "Failed to collect system overview.",
                    timestamp: new Date().toISOString(),
                  })}`,
                  "",
                  "",
                ].join("\n"),
              ),
            );
          }
        };

        signal.addEventListener("abort", close, { once: true });
        void send();
        interval = setInterval(
          () => void send(),
          systemOverviewStreamIntervalMs,
        );
      },
      cancel: () => {
        isClosed = true;

        if (interval) {
          clearInterval(interval);
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
}

function formatSseEvent(event: SystemOverviewRealtimeEventDto): string {
  return [
    "event: system.overview",
    `data: ${JSON.stringify(event)}`,
    "",
    "",
  ].join("\n");
}
