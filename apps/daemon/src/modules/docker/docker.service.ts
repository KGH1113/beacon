import {
  type ControlDockerContainerInput,
  ControlDockerContainerInputSchema,
  type ControlDockerContainerOutput,
  ControlDockerContainerOutputSchema,
  type DockerContainerDto,
  type DockerContainersRealtimeEventDto,
  DockerContainersRealtimeEventDtoSchema,
  type DockerExecOutputDto,
  DockerExecOutputDtoSchema,
  type DockerLogEventDto,
  DockerLogEventDtoSchema,
  type ListDockerContainersOutput,
  ListDockerContainersOutputSchema,
} from "@beacon/shared";

import {
  type DockerExecSession,
  type DockerIntegration,
  createDockerIntegration,
} from "../../integrations/docker";
import { AppError } from "../../shared/errors/app-error";
import { ErrorCode } from "../../shared/errors/error-code";
import {
  type DockerRealtimeBroadcaster,
  dockerRealtimeBroadcaster,
} from "./docker.realtime";

export interface IDockerService {
  controlContainer: (input: unknown) => Promise<ControlDockerContainerOutput>;
  createExecSession: (
    containerId: string,
    onOutput: (event: DockerExecOutputDto) => void,
    onClose: (event: DockerExecOutputDto) => void,
  ) => Promise<DockerExecSession>;
  getContainersEvent: () => Promise<DockerContainersRealtimeEventDto>;
  listContainers: () => Promise<ListDockerContainersOutput>;
  streamContainerLogs: (
    containerId: string,
    signal: AbortSignal,
    onLog: (event: DockerLogEventDto) => void,
  ) => void;
  subscribeContainers: (
    listener: (event: DockerContainersRealtimeEventDto) => void,
  ) => () => void;
}

export class DockerService implements IDockerService {
  constructor(
    private readonly integration: DockerIntegration = createDockerIntegration(),
    private readonly realtime: DockerRealtimeBroadcaster = dockerRealtimeBroadcaster,
  ) {}

  async listContainers(): Promise<ListDockerContainersOutput> {
    return ListDockerContainersOutputSchema.parse({
      containers: await this.integration.listContainers(),
    });
  }

  async getContainersEvent(): Promise<DockerContainersRealtimeEventDto> {
    const output = await this.listContainers();

    return DockerContainersRealtimeEventDtoSchema.parse({
      type: "docker.containers.snapshot",
      timestamp: new Date().toISOString(),
      payload: output,
    });
  }

  subscribeContainers(
    listener: (event: DockerContainersRealtimeEventDto) => void,
  ) {
    return this.realtime.subscribe(listener);
  }

  async controlContainer(
    input: unknown,
  ): Promise<ControlDockerContainerOutput> {
    const parsed = ControlDockerContainerInputSchema.parse(
      input,
    ) satisfies ControlDockerContainerInput;

    await this.integration.controlContainer(parsed.containerId, parsed.action);

    const output = await this.listContainers();
    this.realtime.publishSnapshot(output.containers);

    const container = output.containers.find(
      (item) => item.id === parsed.containerId,
    );

    if (!container) {
      throw new AppError(ErrorCode.NotFound, "Container was not found.", 404);
    }

    return ControlDockerContainerOutputSchema.parse({ container });
  }

  streamContainerLogs(
    containerId: string,
    signal: AbortSignal,
    onLog: (event: DockerLogEventDto) => void,
  ) {
    this.integration.streamContainerLogs(containerId, signal, (line) => {
      onLog(
        DockerLogEventDtoSchema.parse({
          type: "docker.log",
          timestamp: new Date().toISOString(),
          payload: {
            containerId,
            line: line.line,
            stream: line.stream,
          },
        }),
      );
    });
  }

  async createExecSession(
    containerId: string,
    onOutput: (event: DockerExecOutputDto) => void,
    onClose: (event: DockerExecOutputDto) => void,
  ): Promise<DockerExecSession> {
    const container = await this.findContainer(containerId);

    if (container.state !== "running") {
      throw new AppError(
        ErrorCode.ValidationFailed,
        "Container is not running.",
        400,
      );
    }

    onOutput(
      DockerExecOutputDtoSchema.parse({
        type: "docker.exec.output",
        timestamp: new Date().toISOString(),
        payload: {
          data: `Container resolved. Starting ${container.defaultShell} TTY...\r\n`,
          stream: "system",
        },
      }),
    );

    return this.integration.createExecSession(
      container.id,
      container.defaultShell,
      (output) => {
        onOutput(
          DockerExecOutputDtoSchema.parse({
            type: "docker.exec.output",
            timestamp: new Date().toISOString(),
            payload: {
              data: output.line,
              stream: output.stream,
            },
          }),
        );
      },
      (code) => {
        onClose(
          DockerExecOutputDtoSchema.parse({
            type: "docker.exec.output",
            timestamp: new Date().toISOString(),
            payload: {
              data: `\r\nDocker exec session closed with code ${code ?? "unknown"}.\r\n`,
              stream: "system",
            },
          }),
        );
      },
    );
  }

  private async findContainer(
    containerId: string,
  ): Promise<DockerContainerDto> {
    const output = await this.listContainers();
    const container = output.containers.find((item) => item.id === containerId);

    if (!container) {
      throw new AppError(ErrorCode.NotFound, "Container was not found.", 404);
    }

    return container;
  }
}
