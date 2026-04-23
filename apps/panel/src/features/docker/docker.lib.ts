import type { DockerContainerDto } from "@beacon/shared";

export const mockDockerContainers = [
  {
    id: "container-caddy",
    name: "caddy",
    image: "caddy:2.8",
    state: "running",
    status: "Up 12 days",
  },
  {
    id: "container-postgres",
    name: "postgres",
    image: "postgres:16-alpine",
    state: "running",
    status: "Up 4 days",
  },
  {
    id: "container-paper",
    name: "minecraft-paper",
    image: "itzg/minecraft-server:java21",
    state: "running",
    status: "Up 18 hours",
  },
  {
    id: "container-backup",
    name: "restic-backup",
    image: "restic/restic:latest",
    state: "exited",
    status: "Exited 2 hours ago",
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

export function getDockerStateLabel(state: string) {
  return state === "running" ? "Running" : "Stopped";
}
