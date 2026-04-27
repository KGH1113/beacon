import type { Duplex } from "node:stream";
import type {
  DockerContainerDto,
  DockerContainerPortDto,
  DockerContainerState,
} from "@beacon/shared";
import type Dockerode from "dockerode";

export class DockerCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DockerCommandError";
  }
}

export type DockerLogLine = {
  line: string;
  stream: "stdout" | "stderr";
};

export type DockerExecSession = {
  close: () => void;
  resize: (size: { cols: number; rows: number }) => void;
  write: (data: string) => void;
};

export interface DockerIntegration {
  controlContainer: (
    containerId: string,
    action: "start" | "stop" | "restart",
  ) => Promise<void>;
  createExecSession: (
    containerId: string,
    shell: string,
    onOutput: (output: DockerLogLine) => void,
    onClose: (code: number | null) => void,
  ) => Promise<DockerExecSession>;
  listContainers: () => Promise<DockerContainerDto[]>;
  streamContainerLogs: (
    containerId: string,
    signal: AbortSignal,
    onLine: (line: DockerLogLine) => void,
  ) => void;
}

type DockerInspect = {
  Config?: {
    Image?: string;
    Labels?: Record<string, string> | null;
  };
  Id?: string;
  Image?: string;
  Name?: string;
  NetworkSettings?: {
    Ports?: Record<string, Array<{ HostPort?: string }> | null>;
  };
  State?: {
    StartedAt?: string;
    Status?: string;
  };
};

type DockerStats = {
  CPUPerc?: string;
  Container?: string;
  ID?: string;
  MemPerc?: string;
  MemUsage?: string;
  Name?: string;
  NetIO?: string;
};

export function createDockerIntegration(): DockerIntegration {
  return new DockerCliIntegration();
}

class DockerCliIntegration implements DockerIntegration {
  private engine?: Dockerode;

  async listContainers(): Promise<DockerContainerDto[]> {
    const ids = await this.listContainerIds();

    if (ids.length === 0) {
      return [];
    }

    const statsById = await this.readStatsById();
    const containers = await Promise.all(
      ids.map(async (id) => {
        try {
          const inspect = await this.inspectContainer(id);
          const stats = statsById.get(id.slice(0, 12)) ?? statsById.get(id);
          const recentLogs = await this.readRecentLogs(id);
          const defaultShell =
            toDockerState(inspect.State?.Status) === "running"
              ? await this.detectShell(id)
              : "/bin/sh";

          return toContainerDto(inspect, stats, recentLogs, defaultShell);
        } catch {
          return null;
        }
      }),
    );

    return containers
      .filter((container): container is DockerContainerDto =>
        Boolean(container),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async controlContainer(
    containerId: string,
    action: "start" | "stop" | "restart",
  ): Promise<void> {
    await runDocker([action, containerId]);
  }

  streamContainerLogs(
    containerId: string,
    signal: AbortSignal,
    onLine: (line: DockerLogLine) => void,
  ) {
    const process = Bun.spawn(
      ["docker", "logs", "--follow", "--tail", "200", containerId],
      {
        stderr: "pipe",
        stdout: "pipe",
      },
    );

    const close = () => process.kill();

    signal.addEventListener("abort", close, { once: true });
    void readLines(process.stdout, "stdout", onLine);
    void readLines(process.stderr, "stderr", onLine);
    void process.exited.finally(() => {
      signal.removeEventListener("abort", close);
    });
  }

  async createExecSession(
    containerId: string,
    shell: string,
    onOutput: (output: DockerLogLine) => void,
    onClose: (code: number | null) => void,
  ): Promise<DockerExecSession> {
    const engine = await this.getEngine();
    const exec = await engine.getContainer(containerId).exec({
      AttachStderr: true,
      AttachStdin: true,
      AttachStdout: true,
      Cmd: [shell, "-i"],
      Env: ["TERM=xterm-256color"],
      Tty: true,
    });
    const stream = await exec.start({
      Detach: false,
      Tty: true,
      hijack: true,
      stdin: true,
    });
    let isClosed = false;
    let didNotifyClose = false;

    const notifyClose = async () => {
      if (didNotifyClose) {
        return;
      }

      didNotifyClose = true;
      isClosed = true;
      const code = await inspectExecExitCode(exec);
      onClose(code);
    };

    stream.on("data", (chunk: Buffer | string) => {
      onOutput({
        line: chunk.toString(),
        stream: "stdout",
      });
    });
    stream.on("error", (error: Error) => {
      onOutput({
        line: `\r\nDocker exec stream failed: ${formatError(error)}\r\n`,
        stream: "stderr",
      });
      void notifyClose();
    });
    stream.on("end", () => void notifyClose());
    stream.on("close", () => void notifyClose());

    return {
      close: () => {
        if (isClosed) {
          return;
        }

        isClosed = true;
        closeDockerStream(stream);
      },
      resize: ({ cols, rows }) => {
        if (isClosed) {
          return;
        }

        void exec.resize({ h: rows, w: cols }).catch(() => {
          // Resize is best-effort. Some images/shells can ignore it safely.
        });
      },
      write: (data: string) => {
        if (isClosed) {
          return;
        }

        try {
          stream.write(data);
        } catch (error) {
          onOutput({
            line: `\r\nFailed to write to docker exec: ${formatError(error)}\r\n`,
            stream: "stderr",
          });
        }
      },
    };
  }

  private async getEngine(): Promise<Dockerode> {
    if (this.engine) {
      return this.engine;
    }

    const Docker = (await import("dockerode")).default;
    this.engine = new Docker({ socketPath: "/var/run/docker.sock" });

    return this.engine;
  }

  private async listContainerIds(): Promise<string[]> {
    const output = await runDocker([
      "container",
      "ls",
      "-a",
      "-q",
      "--no-trunc",
    ]);

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private async inspectContainer(containerId: string): Promise<DockerInspect> {
    const output = await runDocker(["inspect", containerId]);
    const parsed = JSON.parse(output) as DockerInspect[];
    const inspect = parsed[0];

    if (!inspect) {
      throw new DockerCommandError(
        `Docker container ${containerId} was not found.`,
      );
    }

    return inspect;
  }

  private async readStatsById(): Promise<Map<string, DockerStats>> {
    const stats = new Map<string, DockerStats>();

    try {
      const output = await runDocker([
        "stats",
        "--no-stream",
        "--format",
        "json",
      ]);

      for (const line of output.split("\n")) {
        if (!line.trim()) {
          continue;
        }

        const item = JSON.parse(line) as DockerStats;
        const key = item.ID ?? item.Container;

        if (key) {
          stats.set(key, item);
        }
      }
    } catch {
      return stats;
    }

    return stats;
  }

  private async readRecentLogs(containerId: string): Promise<string[]> {
    try {
      const output = await runDocker(["logs", "--tail", "3", containerId], {
        includeStderr: true,
      });

      return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(-3);
    } catch {
      return [];
    }
  }

  private async detectShell(containerId: string): Promise<string> {
    try {
      const output = await runDocker([
        "exec",
        containerId,
        "sh",
        "-lc",
        "command -v bash || command -v sh || printf /bin/sh",
      ]);
      const shell = output.trim().split("\n")[0];

      return shell || "/bin/sh";
    } catch {
      return "/bin/sh";
    }
  }
}

async function runDocker(
  args: string[],
  options: { includeStderr?: boolean } = {},
): Promise<string> {
  const process = Bun.spawn(["docker", ...args], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    streamToText(process.stdout),
    streamToText(process.stderr),
    process.exited,
  ]);

  if (exitCode !== 0) {
    throw new DockerCommandError(
      stderr.trim() ||
        `docker ${args.join(" ")} failed with exit code ${exitCode}.`,
    );
  }

  return options.includeStderr ? `${stdout}${stderr}` : stdout;
}

async function streamToText(stream: ReadableStream<Uint8Array> | null) {
  if (!stream) {
    return "";
  }

  return new Response(stream).text();
}

async function readLines(
  stream: ReadableStream<Uint8Array> | null,
  outputStream: "stdout" | "stderr",
  onLine: (line: DockerLogLine) => void,
) {
  if (!stream) {
    return;
  }

  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        onLine({ line, stream: outputStream });
      }
    }

    if (buffer) {
      onLine({ line: buffer, stream: outputStream });
    }
  } catch {
    // The process can be killed when the browser closes the stream.
  }
}

function toContainerDto(
  inspect: DockerInspect,
  stats: DockerStats | undefined,
  recentLogs: string[],
  defaultShell: string,
): DockerContainerDto {
  const id = inspect.Id ?? "";
  const name = (inspect.Name ?? id.slice(0, 12)).replace(/^\//, "");
  const state = toDockerState(inspect.State?.Status);

  return {
    id,
    name,
    image: inspect.Config?.Image ?? inspect.Image ?? "unknown",
    state,
    status: getStatusLabel(state, inspect.State?.StartedAt),
    project:
      inspect.Config?.Labels?.["com.docker.compose.project"] ?? "standalone",
    uptimeLabel: getUptimeLabel(state, inspect.State?.StartedAt),
    defaultShell,
    metrics: {
      cpuPercent: parsePercent(stats?.CPUPerc),
      memoryUsageLabel: normalizeDockerUnits(stats?.MemUsage ?? "0 B / 0 B"),
      memoryPercent: parsePercent(stats?.MemPerc),
      networkRxLabel: parseNetIo(stats?.NetIO)[0],
      networkTxLabel: parseNetIo(stats?.NetIO)[1],
    },
    ports: getPorts(inspect),
    recentLogs,
  };
}

function toDockerState(status: string | undefined): DockerContainerState {
  if (status === "running") {
    return "running";
  }

  if (status === "restarting") {
    return "restarting";
  }

  return "exited";
}

function getStatusLabel(state: DockerContainerState, startedAt?: string) {
  if (state === "running") {
    return `Up ${getUptimeLabel(state, startedAt)}`;
  }

  if (state === "restarting") {
    return "Restarting";
  }

  return "Stopped";
}

function getUptimeLabel(state: DockerContainerState, startedAt?: string) {
  if (state !== "running" || !startedAt) {
    return "Not running";
  }

  const started = new Date(startedAt).getTime();

  if (!Number.isFinite(started)) {
    return "Unknown";
  }

  const totalMinutes = Math.max(0, Math.floor((Date.now() - started) / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getPorts(inspect: DockerInspect): DockerContainerPortDto[] {
  const ports = inspect.NetworkSettings?.Ports ?? {};

  return Object.entries(ports)
    .map(([key, bindings]) => {
      const [privatePortValue, protocol = "tcp"] = key.split("/");
      const privatePort = Number(privatePortValue);

      if (!Number.isFinite(privatePort)) {
        return null;
      }

      const publicPortValue = bindings?.[0]?.HostPort;
      const publicPort = publicPortValue ? Number(publicPortValue) : null;

      return {
        privatePort,
        publicPort:
          publicPort && Number.isFinite(publicPort) ? publicPort : null,
        protocol,
      };
    })
    .filter((port): port is DockerContainerPortDto => Boolean(port));
}

function parsePercent(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value.replace("%", ""));

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNetIo(value: string | undefined): [string, string] {
  if (!value) {
    return ["0 B", "0 B"];
  }

  const [rx = "0 B", tx = "0 B"] = value.split("/").map((part) => part.trim());

  return [normalizeDockerUnits(rx), normalizeDockerUnits(tx)];
}

function normalizeDockerUnits(value: string) {
  return value
    .replaceAll("KiB", "KB")
    .replaceAll("MiB", "MB")
    .replaceAll("GiB", "GB")
    .replaceAll("TiB", "TB");
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function inspectExecExitCode(exec: {
  inspect: () => Promise<{ ExitCode?: number | null }>;
}): Promise<number | null> {
  try {
    const result = await exec.inspect();

    return result.ExitCode ?? null;
  } catch {
    return null;
  }
}

function closeDockerStream(stream: Duplex) {
  try {
    stream.end();
  } catch {
    // The stream might already be closed by Docker.
  }

  try {
    stream.destroy();
  } catch {
    // The stream might already be destroyed by Docker.
  }
}
