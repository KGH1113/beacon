import {
  type DockerExecInputDto,
  DockerExecInputDtoSchema,
  type ListDockerContainersOutput,
} from "@beacon/shared";

import type { DockerExecSession } from "../../integrations/docker";
import { DockerService, type IDockerService } from "./docker.service";

const dockerContainersStreamIntervalMs = 5_000;
const dockerStreamHeartbeatMs = 20_000;

type SocketLike = {
  close: () => void;
  send: (data: string) => void;
};

export interface IDockerController {
  control: (
    containerId: string,
    action: string,
  ) => Promise<{ container: ListDockerContainersOutput["containers"][number] }>;
  list: () => Promise<ListDockerContainersOutput>;
  openExec: (
    socket: SocketLike,
    containerId: string,
    send: (data: string) => void,
  ) => void;
  closeExec: (socket: object) => void;
  writeExec: (socket: object, input: unknown) => void;
  streamContainers: (signal: AbortSignal) => Response;
  streamLogs: (containerId: string, signal: AbortSignal) => Response;
}

export class DockerController implements IDockerController {
  private readonly execSessions = new WeakMap<object, DockerExecSession>();
  private readonly pendingExecInputs = new WeakMap<object, string[]>();

  constructor(private readonly service: IDockerService = new DockerService()) {}

  async list(): Promise<ListDockerContainersOutput> {
    return this.service.listContainers();
  }

  async control(containerId: string, action: string) {
    return this.service.controlContainer({ containerId, action });
  }

  streamContainers(signal: AbortSignal): Response {
    const encoder = new TextEncoder();
    let interval: ReturnType<typeof setInterval> | undefined;
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

          if (interval) {
            clearInterval(interval);
          }

          if (heartbeat) {
            clearInterval(heartbeat);
          }

          unsubscribe?.();
          controller.close();
        };

        const sendSnapshot = async () => {
          if (isClosed) {
            return;
          }

          const event = await this.service.getContainersEvent();

          if (!isClosed) {
            controller.enqueue(
              encoder.encode(formatSseEvent(event.type, event)),
            );
          }
        };

        unsubscribe = this.service.subscribeContainers((event) => {
          if (!isClosed) {
            controller.enqueue(
              encoder.encode(formatSseEvent(event.type, event)),
            );
          }
        });

        signal.addEventListener("abort", close, { once: true });
        void sendSnapshot();
        interval = setInterval(
          () => void sendSnapshot(),
          dockerContainersStreamIntervalMs,
        );
        heartbeat = setInterval(() => {
          if (!isClosed) {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }
        }, dockerStreamHeartbeatMs);
      },
      cancel: () => {
        isClosed = true;

        if (interval) {
          clearInterval(interval);
        }

        if (heartbeat) {
          clearInterval(heartbeat);
        }

        unsubscribe?.();
      },
    });

    return sseResponse(stream);
  }

  streamLogs(containerId: string, signal: AbortSignal): Response {
    const encoder = new TextEncoder();
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let isClosed = false;

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const close = () => {
          if (isClosed) {
            return;
          }

          isClosed = true;

          if (heartbeat) {
            clearInterval(heartbeat);
          }

          controller.close();
        };

        signal.addEventListener("abort", close, { once: true });
        this.service.streamContainerLogs(containerId, signal, (event) => {
          if (!isClosed) {
            controller.enqueue(
              encoder.encode(formatSseEvent(event.type, event)),
            );
          }
        });
        heartbeat = setInterval(() => {
          if (!isClosed) {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }
        }, dockerStreamHeartbeatMs);
      },
      cancel: () => {
        isClosed = true;

        if (heartbeat) {
          clearInterval(heartbeat);
        }
      },
    });

    return sseResponse(stream);
  }

  openExec(
    socket: SocketLike,
    containerId: string,
    send: (data: string) => void,
  ) {
    void this.service
      .createExecSession(
        containerId,
        (event) => send(JSON.stringify(event)),
        (event) => {
          send(JSON.stringify(event));
          socket.close();
        },
      )
      .then((session) => {
        this.execSessions.set(socket, session);
        const pendingInputs = this.pendingExecInputs.get(socket) ?? [];

        for (const input of pendingInputs) {
          session.write(input);
        }

        this.pendingExecInputs.delete(socket);
      })
      .catch((error: unknown) => {
        send(
          JSON.stringify({
            type: "docker.exec.output",
            timestamp: new Date().toISOString(),
            payload: {
              data: `Docker exec connection failed: ${formatError(error)}\r\n`,
              stream: "system",
            },
          }),
        );
        socket.close();
      });
  }

  writeExec(socket: object, input: unknown) {
    const parsed = parseSocketInput(input);
    const session = this.execSessions.get(socket);

    if (session) {
      session.write(parsed.payload.data);
      return;
    }

    const pendingInputs = this.pendingExecInputs.get(socket) ?? [];
    pendingInputs.push(parsed.payload.data);
    this.pendingExecInputs.set(socket, pendingInputs);
  }

  closeExec(socket: object) {
    const session = this.execSessions.get(socket);

    if (session) {
      session.close();
    }

    this.execSessions.delete(socket);
    this.pendingExecInputs.delete(socket);
  }
}

function parseSocketInput(input: unknown): DockerExecInputDto {
  let payload = input;

  if (typeof input === "string") {
    payload = JSON.parse(input);
  } else if (input instanceof Uint8Array) {
    payload = JSON.parse(new TextDecoder().decode(input));
  } else if (input instanceof ArrayBuffer) {
    payload = JSON.parse(new TextDecoder().decode(input));
  }

  return DockerExecInputDtoSchema.parse(payload);
}

function sseResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

function formatSseEvent(eventName: string, event: unknown): string {
  return [`event: ${eventName}`, `data: ${JSON.stringify(event)}`, "", ""].join(
    "\n",
  );
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
