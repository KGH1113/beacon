import type { DockerContainerDto, DockerContainerState } from "@beacon/shared";

export const mockDockerContainers = [
  {
    id: "container-caddy",
    name: "caddy",
    image: "caddy:2.8",
    state: "running",
    status: "Up 12 days",
    project: "edge",
    uptimeLabel: "12d 4h",
    defaultShell: "/bin/sh",
    metrics: {
      cpuPercent: 8,
      memoryUsageLabel: "128 MB / 512 MB",
      memoryPercent: 25,
      networkRxLabel: "18.4 GB",
      networkTxLabel: "5.7 GB",
    },
    ports: [
      { privatePort: 80, publicPort: 80, protocol: "tcp" },
      { privatePort: 443, publicPort: 443, protocol: "tcp" },
    ],
    recentLogs: [
      "[12:01:04] certificate renewed for panel.tailnet.local",
      "[12:02:11] reverse proxy upstream healthy",
      "[12:04:35] served /dashboard in 18ms",
    ],
  },
  {
    id: "container-postgres",
    name: "postgres",
    image: "postgres:16-alpine",
    state: "running",
    status: "Up 4 days",
    project: "storage",
    uptimeLabel: "4d 2h",
    defaultShell: "/bin/sh",
    metrics: {
      cpuPercent: 14,
      memoryUsageLabel: "820 MB / 2 GB",
      memoryPercent: 41,
      networkRxLabel: "2.1 GB",
      networkTxLabel: "1.8 GB",
    },
    ports: [{ privatePort: 5432, publicPort: null, protocol: "tcp" }],
    recentLogs: [
      "[12:03:19] checkpoint complete",
      "[12:05:02] autovacuum finished",
      "[12:08:44] connection accepted from app network",
    ],
  },
  {
    id: "container-paper",
    name: "minecraft-paper",
    image: "itzg/minecraft-server:java21",
    state: "running",
    status: "Up 18 hours",
    project: "minecraft",
    uptimeLabel: "18h 12m",
    defaultShell: "/bin/bash",
    metrics: {
      cpuPercent: 42,
      memoryUsageLabel: "5.8 GB / 8 GB",
      memoryPercent: 72,
      networkRxLabel: "8.6 GB",
      networkTxLabel: "11.3 GB",
    },
    ports: [
      { privatePort: 25565, publicPort: 25565, protocol: "tcp" },
      { privatePort: 25575, publicPort: null, protocol: "tcp" },
    ],
    recentLogs: [
      "[12:05:42] saved the game",
      "[12:07:18] player joined the server",
      "[12:09:59] preparing spawn area",
    ],
  },
  {
    id: "container-backup",
    name: "restic-backup",
    image: "restic/restic:latest",
    state: "exited",
    status: "Exited 2 hours ago",
    project: "maintenance",
    uptimeLabel: "last run 2h ago",
    defaultShell: "/bin/sh",
    metrics: {
      cpuPercent: 0,
      memoryUsageLabel: "0 MB / 256 MB",
      memoryPercent: 0,
      networkRxLabel: "0 B",
      networkTxLabel: "24.1 GB",
    },
    ports: [],
    recentLogs: [
      "[10:08:27] snapshot finished",
      "[10:08:32] pruning old snapshots",
      "[10:08:41] container exited with code 0",
    ],
  },
] satisfies DockerContainerDto[];

export const mockDockerLogs = [
  "[12:01:04] caddy: certificate renewed for panel.tailnet.local",
  "[12:03:19] postgres: checkpoint complete",
  "[12:05:42] minecraft-paper: saved the game",
  "[12:08:27] restic-backup: snapshot finished",
];

export function getDockerDescription() {
  return "컨테이너 목록, 상태, 로그와 실행 명령을 관리합니다.";
}

export function getDockerStateLabel(state: DockerContainerState) {
  if (state === "restarting") {
    return "Restarting";
  }

  return state === "running" ? "Running" : "Stopped";
}

export function getDockerStateClassName(state: DockerContainerState) {
  if (state === "running") {
    return "bg-chart-2/20 text-chart-2";
  }

  if (state === "restarting") {
    return "bg-chart-5/20 text-chart-5";
  }

  return "bg-muted text-muted-foreground";
}

export function getDockerSummary(containers: DockerContainerDto[]) {
  return {
    runningCount: containers.filter(
      (container) => container.state === "running",
    ).length,
    stoppedCount: containers.filter((container) => container.state === "exited")
      .length,
    imageCount: new Set(containers.map((container) => container.image)).size,
    openPortCount: containers.reduce(
      (total, container) =>
        total +
        container.ports.filter((port) => port.publicPort !== null).length,
      0,
    ),
  };
}

export function formatDockerPort(port: DockerContainerDto["ports"][number]) {
  const target = `${port.privatePort}/${port.protocol}`;

  return port.publicPort ? `${port.publicPort} -> ${target}` : target;
}
