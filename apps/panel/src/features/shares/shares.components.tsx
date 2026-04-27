"use client";

import type { ShareDto, SharePreviewKind } from "@beacon/shared";
import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  MusicNotesIcon,
  PlayIcon,
  VideoIcon,
} from "@phosphor-icons/react/ssr";
import type React from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { DetailPageHeader } from "@/components/detail-page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils";

import { revokeShareAction } from "./shares.actions";
import { useShareUpload } from "./shares.hooks";
import {
  type ShareFilter,
  filterShares,
  formatShareCreatedAt,
  formatShareExpiry,
  getShareAssetUrl,
  getShareDownloadUrl,
  getShareHref,
  getShareStatusClassName,
  getShareStatusLabel,
  getSharesDescription,
  getSharesSummary,
} from "./shares.lib";
import { useSharesStore } from "./shares.store";

const shareFilters = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "permanent", label: "Permanent" },
] satisfies Array<{ value: ShareFilter; label: string }>;

const previewIconByKind = {
  audio: MusicNotesIcon,
  image: ImageIcon,
  text: FileTextIcon,
  video: VideoIcon,
  document: FileTextIcon,
  file: FileIcon,
} satisfies Record<SharePreviewKind, typeof FileIcon>;

type SharesPageProps = {
  daemonPublicBaseUrl: string;
  daemonUploadBaseUrl: string;
  initialShares: ShareDto[];
  isFallback: boolean;
};

export function SharesPage({
  daemonPublicBaseUrl,
  daemonUploadBaseUrl,
  initialShares,
  isFallback,
}: SharesPageProps) {
  const activeFilter = useSharesStore((state) => state.activeFilter);
  const selectedShareId = useSharesStore((state) => state.selectedShareId);
  const setActiveFilter = useSharesStore((state) => state.setActiveFilter);
  const setSelectedShareId = useSharesStore(
    (state) => state.setSelectedShareId,
  );
  const dragDepthRef = useRef(0);
  const isMountedRef = useRef(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [shares, setShares] = useState(initialShares);
  const { uploadFiles } = useShareUpload({
    daemonUploadBaseUrl,
    onShareUploaded: addUploadedShare,
  });

  const summary = getSharesSummary(shares);
  const filteredShares = useMemo(
    () => filterShares(shares, activeFilter),
    [activeFilter, shares],
  );
  const selectedShare =
    shares.find((share) => share.id === selectedShareId) ??
    filteredShares[0] ??
    null;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function updateShare(updatedShare: ShareDto) {
    setShares((currentShares) =>
      currentShares.map((share) =>
        share.id === updatedShare.id ? updatedShare : share,
      ),
    );
  }

  function addUploadedShare(uploadedShare: ShareDto) {
    if (!isMountedRef.current) {
      return;
    }

    setShares((currentShares) => [
      uploadedShare,
      ...currentShares.filter((share) => share.id !== uploadedShare.id),
    ]);
    setSelectedShareId(uploadedShare.id);
  }

  async function handleUploadFiles(files: FileList | File[]) {
    try {
      await uploadFiles(files);
    } catch {
      toast.error("Upload failed");
    }
  }

  return (
    <section
      className="relative flex min-h-[calc(100svh-3rem)] flex-col gap-4"
      onDragEnter={(event) => {
        if (!Array.from(event.dataTransfer.types).includes("Files")) {
          return;
        }

        dragDepthRef.current += 1;
        setIsDraggingFile(true);
      }}
      onDragLeave={(event) => {
        if (!Array.from(event.dataTransfer.types).includes("Files")) {
          return;
        }

        dragDepthRef.current -= 1;

        if (dragDepthRef.current <= 0) {
          dragDepthRef.current = 0;
          setIsDraggingFile(false);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDraggingFile(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepthRef.current = 0;
        setIsDraggingFile(false);
        void handleUploadFiles(event.dataTransfer.files);
      }}
    >
      {isDraggingFile ? <ShareDropOverlay /> : null}
      <DetailPageHeader
        description={
          isFallback
            ? `${getSharesDescription()} Daemon 연결 실패로 mock data 표시 중입니다.`
            : getSharesDescription()
        }
        status={{
          label: isFallback ? "Mock" : `${summary.activeCount} active`,
          className: isFallback
            ? "bg-chart-5/20 text-chart-5"
            : "bg-chart-2/20 text-chart-2",
        }}
        title="Shares"
      />

      <div className="flex min-w-0 items-stretch gap-4 overflow-x-auto">
        <SummaryCard label="Active links" value={summary.activeCount} />
        <SummaryCard label="Expiring soon" value={summary.expiringCount} />
        <SummaryCard label="Permanent" value={summary.permanentCount} />
        <SummaryCard label="Downloads" value={summary.totalDownloads} />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <SharesTableCard
          activeFilter={activeFilter}
          filteredShares={filteredShares}
          onFilterChange={setActiveFilter}
          onSelectShare={setSelectedShareId}
          selectedShareId={selectedShare?.id ?? null}
        />

        <ShareDetailCard
          daemonPublicBaseUrl={daemonPublicBaseUrl}
          onShareUpdated={updateShare}
          share={selectedShare}
        />
      </div>
    </section>
  );
}

function ShareDropOverlay() {
  return (
    <Card className="pointer-events-none absolute inset-0 z-10 border-dashed bg-background/90">
      <CardContent className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <FileIcon />
        <CardTitle>Drop files to share</CardTitle>
        <CardDescription>
          업로드가 완료되면 7일 만료 공유 링크가 바로 생성됩니다.
        </CardDescription>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex min-h-0 min-w-48 flex-1 flex-col">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function SharesTableCard({
  activeFilter,
  filteredShares,
  onFilterChange,
  onSelectShare,
  selectedShareId,
}: {
  activeFilter: ShareFilter;
  filteredShares: ShareDto[];
  onFilterChange: (value: ShareFilter) => void;
  onSelectShare: (value: string) => void;
  selectedShareId: string | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Share links</CardTitle>
          <CardDescription>
            터널링으로 제공 중인 다운로드 링크 목록입니다.
          </CardDescription>
        </div>
        <Tabs
          onValueChange={(value) => onFilterChange(value as ShareFilter)}
          value={activeFilter}
        >
          <TabsList>
            {shareFilters.map((filter) => (
              <TabsTrigger key={filter.value} value={filter.value}>
                {filter.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Downloads</TableHead>
              <TableHead className="text-right">Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredShares.length === 0 ? (
              <TableRow>
                <TableCell
                  className="h-40 text-center text-muted-foreground"
                  colSpan={5}
                >
                  표시할 공유 링크가 없습니다.
                </TableCell>
              </TableRow>
            ) : null}
            {filteredShares.map((share) => (
              <TableRow
                className={cn(
                  "cursor-pointer",
                  selectedShareId === share.id && "bg-muted/60",
                )}
                key={share.id}
                onClick={() => onSelectShare(share.id)}
              >
                <TableCell className="min-w-52 font-medium">
                  {share.fileName}
                  <p className="truncate text-muted-foreground text-xs">
                    {getShareHref(share)}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    className={getShareStatusClassName(share)}
                    variant="secondary"
                  >
                    {getShareStatusLabel(share)}
                  </Badge>
                </TableCell>
                <TableCell>{share.sizeLabel}</TableCell>
                <TableCell className="text-right">
                  {share.downloadCount}
                </TableCell>
                <TableCell className="text-right">
                  {formatShareExpiry(share.expiresAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ShareDetailCard({
  daemonPublicBaseUrl,
  onShareUpdated,
  share,
}: {
  daemonPublicBaseUrl: string;
  onShareUpdated: (share: ShareDto) => void;
  share: ShareDto | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (!share) {
    return (
      <Card className="flex min-h-0 flex-col">
        <CardHeader>
          <CardTitle>No share selected</CardTitle>
          <CardDescription>
            왼쪽 목록에서 공유 링크를 선택하면 상세 정보가 표시됩니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const selectedShare = share;

  async function copyShareLink() {
    const shareUrl = getShareDownloadUrl(selectedShare, daemonPublicBaseUrl);

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied", {
        description: shareUrl,
      });
    } catch {
      toast.error("Clipboard is not available");
    }
  }

  function revokeShare() {
    startTransition(async () => {
      const result = await revokeShareAction({
        shareId: selectedShare.id,
      });

      if (result.ok) {
        if (result.share) {
          onShareUpdated(result.share);
        }

        toast.info("Share revoked");
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">{share.fileName}</CardTitle>
            <CardDescription className="truncate text-xs">
              {share.filePath}
            </CardDescription>
          </div>
          <Badge
            className={cn("shrink-0", getShareStatusClassName(share))}
            variant="secondary"
          >
            {getShareStatusLabel(share)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
        <FilePreview daemonPublicBaseUrl={daemonPublicBaseUrl} share={share} />

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailMetric label="Size" value={share.sizeLabel} />
          <DetailMetric label="Downloads" value={`${share.downloadCount}`} />
          <DetailMetric
            label="Expires"
            value={formatShareExpiry(share.expiresAt)}
          />
          <DetailMetric
            label="Created"
            value={formatShareCreatedAt(share.createdAt)}
          />
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button onClick={copyShareLink} type="button" variant="outline">
            Copy link
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={share.status === "revoked" || isPending}
                type="button"
                variant="destructive"
              >
                Revoke
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke this share?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 링크는 더 이상 다운로드에 사용할 수 없게 됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={revokeShare} variant="destructive">
                  Revoke
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function FilePreview({
  daemonPublicBaseUrl,
  share,
}: {
  daemonPublicBaseUrl: string;
  share: ShareDto;
}) {
  const PreviewIcon = previewIconByKind[share.preview.kind];
  const streamUrl = getShareAssetUrl(
    share.preview.streamUrl,
    daemonPublicBaseUrl,
  );
  const textPreviewUrl = getShareAssetUrl(
    share.preview.textPreviewUrl,
    daemonPublicBaseUrl,
  );
  const thumbnailUrl = getShareAssetUrl(
    share.preview.thumbnailUrl,
    daemonPublicBaseUrl,
  );

  if (share.preview.kind === "video" && streamUrl) {
    return (
      <VideoPreview
        extension={share.preview.extension}
        streamUrl={streamUrl}
        thumbnailUrl={thumbnailUrl}
        title={share.preview.title}
      />
    );
  }

  if (share.preview.kind === "audio" && streamUrl) {
    return (
      <AudioPreview
        extension={share.preview.extension}
        streamUrl={streamUrl}
        title={share.preview.title}
      />
    );
  }

  if (share.preview.kind === "text" && textPreviewUrl) {
    return (
      <TextPreview
        extension={share.preview.extension}
        textPreviewUrl={textPreviewUrl}
        title={share.preview.title}
      />
    );
  }

  if (thumbnailUrl) {
    return (
      <Card className="aspect-square overflow-hidden border">
        <CardContent className="flex h-full flex-col gap-3 p-3">
          <div className="min-h-0 flex-1 overflow-hidden rounded-none bg-muted">
            <img
              alt={`${share.preview.title} preview`}
              className="size-full object-contain"
              src={thumbnailUrl}
            />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <PreviewIcon />
              <p className="min-w-0 truncate font-medium text-sm">
                {share.preview.title}
              </p>
            </div>
            <Badge variant="outline">{share.preview.extension}</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="aspect-square overflow-hidden border">
      <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-none bg-muted">
          <PreviewIcon />
        </div>
        <div className="flex max-w-full flex-col gap-1">
          <CardTitle className="truncate">{share.preview.title}</CardTitle>
          <CardDescription className="truncate">
            Preview is not available for {share.preview.extension} files.
          </CardDescription>
        </div>
        <Badge variant="outline">{share.preview.extension}</Badge>
      </CardContent>
    </Card>
  );
}

function VideoPreview({
  extension,
  streamUrl,
  thumbnailUrl,
  title,
}: {
  extension: string;
  streamUrl: string;
  thumbnailUrl: string | null;
  title: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <Card className="aspect-square overflow-hidden border">
      <CardContent className="flex h-full flex-col gap-3 p-3">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-none bg-muted">
          {isPlaying ? (
            // biome-ignore lint/a11y/useMediaCaption: Preview derivatives do not have captions in v1.
            <video
              className="size-full object-contain"
              controls
              playsInline
              src={streamUrl}
            />
          ) : thumbnailUrl ? (
            <img
              alt={`${title} thumbnail`}
              className="size-full object-contain"
              src={thumbnailUrl}
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <VideoIcon />
            </div>
          )}
          {isPlaying ? null : (
            <Button
              className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2"
              onClick={() => setIsPlaying(true)}
              type="button"
              variant="secondary"
            >
              <PlayIcon data-icon="inline-start" />
              Play preview
            </Button>
          )}
        </div>
        <PreviewFooter
          extension={extension}
          icon={<VideoIcon />}
          title={title}
        />
      </CardContent>
    </Card>
  );
}

function AudioPreview({
  extension,
  streamUrl,
  title,
}: {
  extension: string;
  streamUrl: string;
  title: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <Card className="aspect-square overflow-hidden border">
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-none bg-muted">
            <MusicNotesIcon />
          </div>
          <div className="flex max-w-full flex-col gap-1">
            <CardTitle className="truncate">{title}</CardTitle>
            <CardDescription className="truncate">
              Low-bitrate audio preview is ready.
            </CardDescription>
          </div>
          {isPlaying ? (
            // biome-ignore lint/a11y/useMediaCaption: Preview derivatives do not have captions in v1.
            <audio className="w-full" controls src={streamUrl} />
          ) : (
            <Button onClick={() => setIsPlaying(true)} type="button">
              <PlayIcon data-icon="inline-start" />
              Play audio
            </Button>
          )}
        </div>
        <PreviewFooter
          extension={extension}
          icon={<MusicNotesIcon />}
          title={title}
        />
      </CardContent>
    </Card>
  );
}

function TextPreview({
  extension,
  textPreviewUrl,
  title,
}: {
  extension: string;
  textPreviewUrl: string;
  title: string;
}) {
  const [textPreview, setTextPreview] = useState("Loading text preview...");

  useEffect(() => {
    let isCurrent = true;

    fetch(textPreviewUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Text preview request failed.");
        }

        return response.text();
      })
      .then((text) => {
        if (isCurrent) {
          setTextPreview(text || "No previewable text content.");
        }
      })
      .catch(() => {
        if (isCurrent) {
          setTextPreview("Text preview is unavailable.");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [textPreviewUrl]);

  return (
    <Card className="aspect-square overflow-hidden border">
      <CardContent className="flex h-full flex-col gap-3 p-3">
        <pre className="min-h-0 flex-1 overflow-auto rounded-none bg-muted p-4 text-left text-sm">
          {textPreview}
        </pre>
        <PreviewFooter
          extension={extension}
          icon={<FileTextIcon />}
          title={title}
        />
      </CardContent>
    </Card>
  );
}

function PreviewFooter({
  extension,
  icon,
  title,
}: {
  extension: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <p className="min-w-0 truncate font-medium text-sm">{title}</p>
      </div>
      <Badge variant="outline">{extension}</Badge>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}
