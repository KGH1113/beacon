import type {
  DockerContainerDto,
  DockerContainerPortDto,
  DockerContainerState,
} from "@beacon/shared";

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
  ) => DockerExecSession;
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
  async listContainers(): Promise<DockerContainerDto[]> {
    const ids = await this.listContainerIds();

    if (ids.length === 0) {
      return [];
    }

    const statsById = await this.readStatsById();
    const containers = await Promise.all(
      ids.map(async (id) => {
        const inspect = await this.inspectContainer(id);
        const stats = statsById.get(id.slice(0, 12)) ?? statsById.get(id);
        const recentLogs = await this.readRecentLogs(id);
        const defaultShell =
          toDockerState(inspect.State?.Status) === "running"
            ? await this.detectShell(id)
            : "/bin/sh";

        return toContainerDto(inspect, stats, recentLogs, defaultShell);
      }),
    );

    return containers.sort((left, right) =>
      left.name.localeCompare(right.name),
    );
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

  createExecSession(
    containerId: string,
    shell: string,
    onOutput: (output: DockerLogLine) => void,
    onClose: (code: number | null) => void,
  ): DockerExecSession {
    const process = Bun.spawn(
      ["docker", "exec", "-i", containerId, shell, "-lc", beaconShellScript],
      {
        stderr: "pipe",
        stdin: "pipe",
        stdout: "pipe",
      },
    );
    const encoder = new TextEncoder();
    let isClosed = false;

    void readChunks(process.stdout, "stdout", onOutput);
    void readChunks(process.stderr, "stderr", onOutput);
    void process.exited.then((code) => {
      isClosed = true;
      onClose(code);
    });

    return {
      close: () => {
        if (isClosed) {
          return;
        }

        isClosed = true;
        process.stdin.end();
        process.kill();
      },
      write: (data: string) => {
        if (isClosed) {
          return;
        }

        try {
          process.stdin.write(encoder.encode(data));
          process.stdin.flush();
        } catch (error) {
          onOutput({
            line: `\r\nFailed to write to docker exec: ${formatError(error)}\r\n`,
            stream: "stderr",
          });
        }
      },
    };
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

const beaconShellScript = [
  'printf "__BEACON_READY__\\n"',
  "while IFS= read -r __beacon_cmd; do",
  '  eval "$__beacon_cmd"',
  '  printf "\\n__BEACON_PROMPT__\\n"',
  "done",
].join("\n");

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

async function readChunks(
  stream: ReadableStream<Uint8Array> | null,
  outputStream: "stdout" | "stderr",
  onOutput: (line: DockerLogLine) => void,
) {
  if (!stream) {
    return;
  }

  const decoder = new TextDecoder();
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      onOutput({
        line: decoder.decode(value, { stream: true }),
        stream: outputStream,
      });
    }
  } catch {
    // The exec process can be closed while a read is pending.
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
