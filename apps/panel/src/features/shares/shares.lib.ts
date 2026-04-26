import type { ShareDto } from "@beacon/shared";

export type ShareFilter = "all" | "active" | "expiring" | "permanent";

const mockNow = new Date("2026-04-24T09:00:00.000Z");

function svgPreviewDataUri(title: string, subtitle: string) {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="hsl(220 13% 12%)"/><rect x="32" y="32" width="576" height="296" fill="hsl(220 13% 16%)" stroke="hsl(220 13% 30%)"/><text x="56" y="178" fill="hsl(0 0% 94%)" font-family="monospace" font-size="38" font-weight="700">${title}</text><text x="56" y="224" fill="hsl(0 0% 64%)" font-family="monospace" font-size="22">${subtitle}</text></svg>`,
  )}`;
}

export const mockShares = [
  {
    id: "share-server-screenshot",
    token: "share_2aa8_screen",
    filePath: "/shares/gallery/server-screenshot.png",
    fileName: "server-screenshot.png",
    sizeLabel: "3.8 MB",
    downloadCount: 18,
    status: "active",
    preview: {
      kind: "image",
      extension: "PNG",
      thumbnailUrl: svgPreviewDataUri("server-screenshot", "image preview"),
      title: "Server screenshot",
    },
    expiresAt: "2026-05-01T09:00:00.000Z",
    createdAt: "2026-04-24T02:30:00.000Z",
    updatedAt: "2026-04-24T02:30:00.000Z",
  },
  {
    id: "share-world-tour",
    token: "share_7f2k_tour",
    filePath: "/shares/video/world-tour.mp4",
    fileName: "world-tour.mp4",
    sizeLabel: "428 MB",
    downloadCount: 42,
    status: "active",
    preview: {
      kind: "video",
      extension: "MP4",
      thumbnailUrl: svgPreviewDataUri("world-tour", "video thumbnail"),
      title: "World tour clip",
    },
    expiresAt: "2026-04-27T12:00:00.000Z",
    createdAt: "2026-04-23T15:12:00.000Z",
    updatedAt: "2026-04-23T15:12:00.000Z",
  },
  {
    id: "share-runbook",
    token: "share_9q1m_doc",
    filePath: "/shares/docs/beacon-runbook.pdf",
    fileName: "beacon-runbook.pdf",
    sizeLabel: "2.1 MB",
    downloadCount: 7,
    status: "active",
    preview: {
      kind: "document",
      extension: "PDF",
      thumbnailUrl: svgPreviewDataUri("BEACON", "runbook document"),
      title: "Beacon runbook",
    },
    expiresAt: null,
    createdAt: "2026-04-21T20:45:00.000Z",
    updatedAt: "2026-04-22T08:10:00.000Z",
  },
  {
    id: "share-world-backup",
    token: "share_4ck9_backup",
    filePath: "/shares/archive/world-backup.zip",
    fileName: "world-backup.zip",
    sizeLabel: "2.4 GB",
    downloadCount: 3,
    status: "revoked",
    preview: {
      kind: "file",
      extension: "ZIP",
      thumbnailUrl: null,
      title: "World backup archive",
    },
    expiresAt: "2026-04-22T18:00:00.000Z",
    createdAt: "2026-04-20T11:10:00.000Z",
    updatedAt: "2026-04-23T10:00:00.000Z",
  },
] satisfies ShareDto[];

export function getSharesDescription() {
  return "다운로드 링크 생성과 활성 공유 목록을 관리합니다.";
}

export function formatShareExpiry(expiresAt: string | null) {
  return expiresAt
    ? new Date(expiresAt).toLocaleDateString("ko-KR")
    : "Permanent";
}

export function formatShareCreatedAt(createdAt: string | undefined) {
  return createdAt ? new Date(createdAt).toLocaleString("ko-KR") : "Unknown";
}

export function getShareHref(share: ShareDto) {
  return `/s/${share.token}`;
}

export function getShareDownloadUrl(share: ShareDto, baseUrl: string) {
  return new URL(getShareHref(share), baseUrl).toString();
}

export function isShareExpiringSoon(share: ShareDto) {
  if (share.status !== "active" || !share.expiresAt) {
    return false;
  }

  const expiresAt = new Date(share.expiresAt);
  const daysUntilExpiry =
    (expiresAt.getTime() - mockNow.getTime()) / (1000 * 60 * 60 * 24);

  return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
}

export function getShareStatusLabel(share: ShareDto) {
  if (share.status === "revoked") {
    return "Revoked";
  }

  if (share.expiresAt === null) {
    return "Permanent";
  }

  if (isShareExpiringSoon(share)) {
    return "Expiring";
  }

  return "Active";
}

export function getShareStatusClassName(share: ShareDto) {
  if (share.status === "revoked") {
    return "bg-muted text-muted-foreground";
  }

  if (share.expiresAt === null) {
    return "bg-chart-4/20 text-chart-4";
  }

  if (isShareExpiringSoon(share)) {
    return "bg-chart-5/20 text-chart-5";
  }

  return "bg-chart-2/20 text-chart-2";
}

export function filterShares(shares: ShareDto[], filter: ShareFilter) {
  if (filter === "active") {
    return shares.filter((share) => share.status === "active");
  }

  if (filter === "expiring") {
    return shares.filter(isShareExpiringSoon);
  }

  if (filter === "permanent") {
    return shares.filter(
      (share) => share.status === "active" && share.expiresAt === null,
    );
  }

  return shares;
}

export function getSharesSummary(shares: ShareDto[]) {
  const activeShares = shares.filter((share) => share.status === "active");

  return {
    activeCount: activeShares.length,
    expiringCount: activeShares.filter(isShareExpiringSoon).length,
    permanentCount: activeShares.filter((share) => share.expiresAt === null)
      .length,
    totalDownloads: shares.reduce(
      (total, share) => total + share.downloadCount,
      0,
    ),
  };
}
