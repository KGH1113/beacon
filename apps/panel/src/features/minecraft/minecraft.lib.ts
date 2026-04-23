import type { MinecraftServerDto } from "@beacon/shared";

export const mockMinecraftServers = [
  {
    id: "mc-survival",
    name: "Survival",
    host: "survival.tailnet.local",
    port: 25565,
    online: true,
  },
  {
    id: "mc-creative",
    name: "Creative Lab",
    host: "creative.tailnet.local",
    port: 25566,
    online: true,
  },
  {
    id: "mc-archive",
    name: "Archive",
    host: "archive.tailnet.local",
    port: 25567,
    online: false,
  },
] satisfies MinecraftServerDto[];

export const mockRconOutput = [
  "> list",
  "There are 5 of a max of 20 players online: kgh, builder_01, redstone_cat, olive, min",
  "> say Backup starts in 10 minutes",
  "[Server] Backup starts in 10 minutes",
];

export function getMinecraftDescription() {
  return "마인크래프트 서버 상태와 RCON 제어를 다룹니다.";
}

export function getMinecraftStatusLabel(online: boolean) {
  return online ? "Online" : "Offline";
}
