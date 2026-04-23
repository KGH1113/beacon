import { panelRoutes } from "@/routes";
import { mockDockerContainers } from "../docker/docker.lib";
import { mockMinecraftServers } from "../minecraft/minecraft.lib";
import { mockShares } from "../shares/shares.lib";
import { getResourceMetric } from "../system/system.lib";

export type DashboardModuleSymbol =
  | "system"
  | "docker"
  | "minecraft"
  | "shares";
export type DashboardStatusTone = "success" | "info" | "warning";

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

const cpuMetric = getResourceMetric("cpu");
const memoryMetric = getResourceMetric("memory");

export const mockDashboardModules = [
  {
    title: "System",
    description: "Host metrics, storage, network, and open ports",
    href: panelRoutes.system,
    symbol: "system",
    primaryValue: String(cpuMetric.usagePercent),
    primaryUnit: "%",
    primaryLabel: "CPU",
    secondaryMetric: `${memoryMetric.usagePercent}% RAM`,
    status: "Healthy",
    statusTone: "success",
  },
  {
    title: "Docker",
    description: "Container status, logs, and container shell access",
    href: panelRoutes.docker,
    symbol: "docker",
    primaryValue: String(
      mockDockerContainers.filter((container) => container.state === "running")
        .length,
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
    primaryValue: String(mockShares.length),
    primaryUnit: "lnk",
    primaryLabel: "Links",
    secondaryMetric: "2 expiring this week",
    status: "Available",
    statusTone: "warning",
  },
] satisfies DashboardModule[];

export function getDashboardDescription() {
  return "모듈을 선택해서 홈서버의 세부 제어 화면으로 이동합니다.";
}
