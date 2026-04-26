import type { ShareDto, SystemOverviewDto } from "@beacon/shared";

import { panelRoutes } from "@/routes";
import { mockDockerContainers } from "../docker/docker.lib";
import { mockMinecraftServers } from "../minecraft/minecraft.lib";
import { getSharesSummary, mockShares } from "../shares/shares.lib";
import type { SystemOverviewStreamStatus } from "../system/system.hooks";
import {
  getResourceMetric,
  getSystemStatusLabel,
  mockSystemOverview,
} from "../system/system.lib";

export type DashboardModuleSymbol =
  | "system"
  | "docker"
  | "minecraft"
  | "shares";
export type DashboardStatusTone = "success" | "info" | "warning" | "danger";

export type DashboardModule = {
  title: string;
  description: string;
  href: string;
  symbol: DashboardModuleSymbol;
  primaryValue: string;
  primaryUnit: string;
  primaryLabel: string;
  secondaryMetric: string;
  status: string;
  statusTone: DashboardStatusTone;
};

export type DashboardModulesInput = {
  isSharesFallback?: boolean;
  isSystemFallback?: boolean;
  shares?: ShareDto[];
  systemOverview?: SystemOverviewDto;
  systemStreamStatus?: SystemOverviewStreamStatus;
};

export function getDashboardModules({
  isSharesFallback = false,
  isSystemFallback = false,
  shares = mockShares,
  systemOverview = mockSystemOverview,
}: DashboardModulesInput = {}) {
  const cpuMetric = getResourceMetric("cpu", systemOverview);
  const memoryMetric = getResourceMetric("memory", systemOverview);
  const shareSummary = getSharesSummary(shares);

  return [
    {
      title: "System",
      description: "Host metrics, storage, network, and open ports",
      href: panelRoutes.system,
      symbol: "system",
      primaryValue: String(cpuMetric.usagePercent),
      primaryUnit: "%",
      primaryLabel: "CPU",
      secondaryMetric: `${memoryMetric.usagePercent}% RAM`,
      status: isSystemFallback
        ? "Mock"
        : getSystemStatusLabel(systemOverview.status),
      statusTone: getSystemStatusTone(systemOverview.status, isSystemFallback),
    },
    {
      title: "Docker",
      description: "Container status, logs, and container shell access",
      href: panelRoutes.docker,
      symbol: "docker",
      primaryValue: String(
        mockDockerContainers.filter(
          (container) => container.state === "running",
        ).length,
      ),
      primaryUnit: "ctn",
      primaryLabel: "Running",
      secondaryMetric: `${mockDockerContainers.length} total containers`,
      status: "Active",
      statusTone: "info",
    },
    {
      title: "Minecraft",
      description: "Server list, online state, player counts, and RCON",
      href: panelRoutes.minecraft,
      symbol: "minecraft",
      primaryValue: String(
        mockMinecraftServers.filter((server) => server.online).length,
      ),
      primaryUnit: "srv",
      primaryLabel: "Online",
      secondaryMetric: `${mockMinecraftServers.length} configured servers`,
      status: "Online",
      statusTone: "success",
    },
    {
      title: "Shares",
      description: "File share links, expiry, and active downloads",
      href: panelRoutes.shares,
      symbol: "shares",
      primaryValue: String(shares.length),
      primaryUnit: "lnk",
      primaryLabel: "Links",
      secondaryMetric: `${shareSummary.activeCount} active / ${shareSummary.totalDownloads} downloads`,
      status: isSharesFallback ? "Mock" : getSharesStatusLabel(shareSummary),
      statusTone: getSharesStatusTone(shareSummary, isSharesFallback),
    },
  ] satisfies DashboardModule[];
}

export const mockDashboardModules = getDashboardModules();

export function getDashboardDescription() {
  return "모듈을 선택해서 홈서버의 세부 제어 화면으로 이동합니다.";
}

function getSystemStatusTone(
  status: SystemOverviewDto["status"],
  isFallback: boolean,
): DashboardStatusTone {
  if (isFallback) {
    return "warning";
  }

  const tones = {
    critical: "danger",
    healthy: "success",
    warning: "warning",
  } satisfies Record<SystemOverviewDto["status"], DashboardStatusTone>;

  return tones[status];
}

function getSharesStatusLabel(
  summary: ReturnType<typeof getSharesSummary>,
): string {
  if (summary.activeCount > 0) {
    return "Available";
  }

  return "Empty";
}

function getSharesStatusTone(
  summary: ReturnType<typeof getSharesSummary>,
  isFallback: boolean,
): DashboardStatusTone {
  if (isFallback) {
    return "warning";
  }

  if (summary.activeCount > 0) {
    return "success";
  }

  return "info";
}
