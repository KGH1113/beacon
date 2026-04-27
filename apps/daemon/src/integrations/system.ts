import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { cpus, hostname, uptime } from "node:os";
import { setInterval } from "node:timers";
import { promisify } from "node:util";

import type {
  SystemNetworkSampleDto,
  SystemOpenPortDto,
  SystemOverviewDto,
  SystemResourceMetricDto,
} from "@beacon/shared";

const execFileAsync = promisify(execFile);
const networkSampleIntervalMs = 5_000;
const maxNetworkSamples = 12;

type CpuSnapshot = {
  idle: number;
  total: number;
};

type NetworkCounter = {
  rxBytes: number;
  txBytes: number;
  timestampMs: number;
};

type SafeResult<T> = {
  value: T;
  degraded: boolean;
};

export interface SystemIntegration {
  readOverview: () => Promise<SystemOverviewDto>;
}

class LinuxSystemIntegration implements SystemIntegration {
  private previousCpuSnapshot?: CpuSnapshot;
  private previousNetworkCounter?: NetworkCounter;
  private readonly networkSamples: SystemNetworkSampleDto[] = [];

  constructor() {
    void this.captureNetworkSample().catch(() => undefined);

    const interval = setInterval(() => {
      void this.captureNetworkSample().catch(() => undefined);
    }, networkSampleIntervalMs);

    interval.unref();
  }

  async readOverview(): Promise<SystemOverviewDto> {
    const [cpu, memory, storage, ports] = await Promise.all([
      this.safe(() => this.readCpuMetric(), this.createFallbackResource("cpu")),
      this.safe(
        () => this.readMemoryMetric(),
        this.createFallbackResource("memory"),
      ),
      this.safe(
        () => this.readStorageMetric(),
        this.createFallbackResource("storage"),
      ),
      this.safe(() => this.readOpenPorts(), []),
    ]);

    const networkSamples = this.getNetworkSamples();
    const degraded =
      cpu.degraded ||
      memory.degraded ||
      storage.degraded ||
      ports.degraded ||
      networkSamples.length === 0;

    const resources = [cpu.value, memory.value, storage.value];
    const status = this.getStatus(resources, degraded);

    return {
      hostname: hostname(),
      status,
      uptimeLabel: formatUptime(uptime()),
      resources,
      networkSamples:
        networkSamples.length > 0
          ? networkSamples
          : [
              {
                label: getTimeLabel(new Date()),
                timestampMs: Date.now(),
                rxMbps: 0,
                txMbps: 0,
              },
            ],
      openPorts: ports.value,
    };
  }

  private async safe<T>(
    collect: () => Promise<T>,
    fallback: T,
  ): Promise<SafeResult<T>> {
    try {
      return {
        value: await collect(),
        degraded: false,
      };
    } catch {
      return {
        value: fallback,
        degraded: true,
      };
    }
  }

  private async readCpuMetric(): Promise<SystemResourceMetricDto> {
    const current = await readCpuSnapshot();
    const usagePercent = calculateCpuUsagePercent(
      this.previousCpuSnapshot,
      current,
    );

    this.previousCpuSnapshot = current;

    const cpuList = cpus();
    const averageGhz =
      cpuList.length > 0
        ? cpuList.reduce((sum, cpu) => sum + cpu.speed, 0) /
          cpuList.length /
          1_000
        : 0;

    return {
      id: "cpu",
      label: "CPU",
      usagePercent,
      detail: `${cpuList.length} cores / ${formatNumber(averageGhz)} GHz avg`,
    };
  }

  private async readMemoryMetric(): Promise<SystemResourceMetricDto> {
    const meminfo = await readFile("/proc/meminfo", "utf8");
    const totalKb = readMeminfoValue(meminfo, "MemTotal");
    const availableKb = readMeminfoValue(meminfo, "MemAvailable");
    const usedBytes = (totalKb - availableKb) * 1024;
    const totalBytes = totalKb * 1024;

    return {
      id: "memory",
      label: "RAM",
      usagePercent: calculatePercent(usedBytes, totalBytes),
      detail: `${formatBytes(usedBytes)} of ${formatBytes(totalBytes)}`,
    };
  }

  private async readStorageMetric(): Promise<SystemResourceMetricDto> {
    const stdout = await runCommand("df", ["-B1", "-P", "/"]);
    const [, rootLine] = stdout.trim().split("\n");

    if (!rootLine) {
      throw new Error("Missing root filesystem df row");
    }

    const columns = rootLine.trim().split(/\s+/);
    const totalBytes = Number(columns[1]);
    const usedBytes = Number(columns[2]);

    if (!Number.isFinite(totalBytes) || !Number.isFinite(usedBytes)) {
      throw new Error("Invalid root filesystem df row");
    }

    return {
      id: "storage",
      label: "SSD",
      usagePercent: calculatePercent(usedBytes, totalBytes),
      detail: `${formatBytes(usedBytes)} of ${formatBytes(totalBytes)}`,
    };
  }

  private async readOpenPorts(): Promise<SystemOpenPortDto[]> {
    const stdout = await runCommand("ss", ["-H", "-lntu"]);
    const ports = new Map<
      string,
      SystemOpenPortDto & { exposurePriority: number }
    >();

    for (const line of stdout.split("\n")) {
      const row = parseSsRow(line);

      if (!row) {
        continue;
      }

      const exposure = classifyExposure(row.address, row.port);
      const exposurePriority = getExposurePriority(exposure);
      const key = `${row.protocol}:${row.port}`;
      const current = ports.get(key);

      if (current && current.exposurePriority >= exposurePriority) {
        continue;
      }

      ports.set(key, {
        port: row.port,
        protocol: row.protocol,
        service: getServiceName(row.port),
        exposure,
        exposurePriority,
      });
    }

    return [...ports.values()]
      .map(({ exposurePriority: _exposurePriority, ...port }) => port)
      .sort((left, right) => left.port - right.port);
  }

  private async captureNetworkSample(): Promise<void> {
    const current = await readNetworkCounter();
    const previous = this.previousNetworkCounter;
    this.previousNetworkCounter = current;

    if (!previous) {
      this.pushNetworkSample({
        label: getTimeLabel(new Date(current.timestampMs)),
        timestampMs: current.timestampMs,
        rxMbps: 0,
        txMbps: 0,
      });
      return;
    }

    const seconds = (current.timestampMs - previous.timestampMs) / 1_000;

    if (seconds <= 0) {
      return;
    }

    this.pushNetworkSample({
      label: getTimeLabel(new Date(current.timestampMs)),
      timestampMs: current.timestampMs,
      rxMbps: roundToOne(
        ((current.rxBytes - previous.rxBytes) * 8) / seconds / 1_000_000,
      ),
      txMbps: roundToOne(
        ((current.txBytes - previous.txBytes) * 8) / seconds / 1_000_000,
      ),
    });
  }

  private pushNetworkSample(sample: SystemNetworkSampleDto): void {
    this.networkSamples.push(sample);

    if (this.networkSamples.length > maxNetworkSamples) {
      this.networkSamples.splice(
        0,
        this.networkSamples.length - maxNetworkSamples,
      );
    }
  }

  private getNetworkSamples(): SystemNetworkSampleDto[] {
    return [...this.networkSamples];
  }

  private createFallbackResource(
    id: SystemResourceMetricDto["id"],
  ): SystemResourceMetricDto {
    const labels = {
      cpu: "CPU",
      memory: "RAM",
      storage: "SSD",
    } satisfies Record<SystemResourceMetricDto["id"], string>;

    return {
      id,
      label: labels[id],
      usagePercent: 0,
      detail: "Unavailable",
    };
  }

  private getStatus(
    resources: SystemResourceMetricDto[],
    degraded: boolean,
  ): SystemOverviewDto["status"] {
    const maxUsage = Math.max(
      ...resources.map((resource) => resource.usagePercent),
    );

    if (maxUsage >= 95) {
      return "critical";
    }

    if (degraded || maxUsage >= 85) {
      return "warning";
    }

    return "healthy";
  }
}

export function createSystemIntegration(): SystemIntegration {
  return new LinuxSystemIntegration();
}

async function readCpuSnapshot(): Promise<CpuSnapshot> {
  const stat = await readFile("/proc/stat", "utf8");
  const cpuLine = stat.split("\n").find((line) => line.startsWith("cpu "));

  if (!cpuLine) {
    throw new Error("Missing aggregate cpu row");
  }

  const values = cpuLine.trim().split(/\s+/).slice(1).map(Number);
  const idle = (values[3] ?? 0) + (values[4] ?? 0);
  const total = values.reduce((sum, value) => sum + value, 0);

  return { idle, total };
}

function calculateCpuUsagePercent(
  previous: CpuSnapshot | undefined,
  current: CpuSnapshot,
): number {
  if (!previous) {
    return 0;
  }

  const idleDelta = current.idle - previous.idle;
  const totalDelta = current.total - previous.total;

  if (totalDelta <= 0) {
    return 0;
  }

  return clampPercent((1 - idleDelta / totalDelta) * 100);
}

function readMeminfoValue(meminfo: string, key: string): number {
  const line = meminfo
    .split("\n")
    .find((candidate) => candidate.startsWith(`${key}:`));

  if (!line) {
    throw new Error(`Missing meminfo key: ${key}`);
  }

  const value = Number(line.replace(`${key}:`, "").trim().split(/\s+/)[0]);

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid meminfo key: ${key}`);
  }

  return value;
}

async function readNetworkCounter(): Promise<NetworkCounter> {
  const netdev = await readFile("/proc/net/dev", "utf8");
  let rxBytes = 0;
  let txBytes = 0;

  for (const line of netdev.split("\n").slice(2)) {
    const [name, values] = line.split(":");

    if (!name || !values || name.trim() === "lo") {
      continue;
    }

    const fields = values.trim().split(/\s+/).map(Number);
    rxBytes += fields[0] ?? 0;
    txBytes += fields[8] ?? 0;
  }

  return {
    rxBytes,
    txBytes,
    timestampMs: Date.now(),
  };
}

async function runCommand(command: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(command, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 2_000,
  });

  return String(stdout);
}

function parseSsRow(
  line: string,
):
  | { protocol: SystemOpenPortDto["protocol"]; address: string; port: number }
  | undefined {
  const columns = line.trim().split(/\s+/);

  if (columns.length < 5) {
    return undefined;
  }

  const protocol = columns[0]?.startsWith("udp") ? "udp" : "tcp";
  const localAddress = columns[4];
  const port = extractPort(localAddress);
  const address = extractAddress(localAddress);

  if (!port || !address) {
    return undefined;
  }

  return { protocol, address, port };
}

function extractPort(localAddress: string | undefined): number | undefined {
  if (!localAddress) {
    return undefined;
  }

  const match = localAddress.match(/:(\d+)$/);
  const port = match ? Number(match[1]) : Number.NaN;

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return undefined;
  }

  return port;
}

function extractAddress(localAddress: string | undefined): string | undefined {
  if (!localAddress) {
    return undefined;
  }

  if (localAddress.startsWith("[")) {
    const end = localAddress.lastIndexOf("]:");

    if (end === -1) {
      return undefined;
    }

    return localAddress.slice(1, end).split("%")[0];
  }

  const end = localAddress.lastIndexOf(":");

  if (end === -1) {
    return undefined;
  }

  return localAddress.slice(0, end).split("%")[0];
}

function classifyExposure(
  address: string,
  port: number,
): SystemOpenPortDto["exposure"] {
  if (isLoopbackAddress(address)) {
    return "local";
  }

  if (isTailscaleAddress(address)) {
    return "tailscale";
  }

  if (port === 80 || port === 443) {
    return "funnel";
  }

  if (isWildcardAddress(address) || isPublicAddress(address)) {
    return "public";
  }

  return "local";
}

function getExposurePriority(exposure: SystemOpenPortDto["exposure"]): number {
  const priorities = {
    local: 0,
    tailscale: 1,
    funnel: 2,
    public: 3,
  } satisfies Record<SystemOpenPortDto["exposure"], number>;

  return priorities[exposure];
}

function isLoopbackAddress(address: string): boolean {
  return (
    address === "localhost" || address === "::1" || address.startsWith("127.")
  );
}

function isTailscaleAddress(address: string): boolean {
  const parts = address.split(".").map(Number);

  return parts[0] === 100 && (parts[1] ?? 0) >= 64 && (parts[1] ?? 0) <= 127;
}

function isWildcardAddress(address: string): boolean {
  return address === "*" || address === "0.0.0.0" || address === "::";
}

function isPublicAddress(address: string): boolean {
  return !isLoopbackAddress(address) && !isTailscaleAddress(address);
}

function getServiceName(port: number): string {
  const services: Record<number, string> = {
    22: "SSH",
    80: "HTTP",
    443: "HTTPS",
    25565: "Minecraft",
    3000: "Beacon Panel",
    7300: "Beacon Daemon",
  } satisfies Record<number, string>;

  return services[port] ?? `Port ${port}`;
}

function calculatePercent(used: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return clampPercent((used / total) * 100);
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${formatNumber(value)} ${units[unitIndex]}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);

  if (days > 0) {
    return `${days}d ${hours}h uptime`;
  }

  return `${hours}h uptime`;
}

function getTimeLabel(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function roundToOne(value: number): number {
  return Math.max(0, Math.round(value * 10) / 10);
}
