import type { ShareDto } from "@beacon/shared";

export const mockShares = [
  {
    id: "share-world-backup",
    token: "share_7f2k_world",
    filePath: "/shares/world-backup.zip",
    fileName: "world-backup.zip",
    expiresAt: "2026-05-01T09:00:00.000Z",
    createdAt: "2026-04-24T02:30:00.000Z",
    updatedAt: "2026-04-24T02:30:00.000Z",
  },
  {
    id: "share-modpack",
    token: "share_9q1m_modpack",
    filePath: "/shares/friends-modpack.zip",
    fileName: "friends-modpack.zip",
    expiresAt: "2026-04-27T12:00:00.000Z",
    createdAt: "2026-04-23T15:12:00.000Z",
    updatedAt: "2026-04-23T15:12:00.000Z",
  },
  {
    id: "share-screenshots",
    token: "share_2aa8_screens",
    filePath: "/shares/server-screenshots.tar",
    fileName: "server-screenshots.tar",
    expiresAt: null,
    createdAt: "2026-04-21T20:45:00.000Z",
    updatedAt: "2026-04-22T08:10:00.000Z",
  },
] satisfies ShareDto[];

export function getSharesDescription() {
  return "다운로드 링크 생성과 활성 공유 목록을 관리합니다.";
}

export function formatShareExpiry(expiresAt: string | null) {
  return expiresAt
    ? new Date(expiresAt).toLocaleDateString("ko-KR")
    : "No expiry";
}
