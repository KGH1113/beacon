"use client";

import type { ShareDto, SharePreviewKind } from "@beacon/shared";
import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  UploadSimpleIcon,
  VideoIcon,
} from "@phosphor-icons/react/ssr";
import {
  type DragEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import {
  type ShareFilter,
  filterShares,
  formatShareCreatedAt,
  formatShareExpiry,
  getShareHref,
  getShareStatusClassName,
  getShareStatusLabel,
  getSharesDescription,
  getSharesSummary,
  mockShares,
} from "./shares.lib";
import { useSharesStore } from "./shares.store";

const shareFilters = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "permanent", label: "Permanent" },
] satisfies Array<{ value: ShareFilter; label: string }>;

const previewIconByKind = {
  image: ImageIcon,
  video: VideoIcon,
  document: FileTextIcon,
  file: FileIcon,
} satisfies Record<SharePreviewKind, typeof FileIcon>;

export function SharesPage() {
  const activeFilter = useSharesStore((state) => state.activeFilter);
  const selectedShareId = useSharesStore((state) => state.selectedShareId);
  const setActiveFilter = useSharesStore((state) => state.setActiveFilter);
  const setSelectedShareId = useSharesStore(
    (state) => state.setSelectedShareId,
  );
  const dragDepthRef = useRef(0);
  const [isDragActive, setDragActive] = useState(false);

  const summary = getSharesSummary(mockShares);
  const filteredShares = useMemo(
    () => filterShares(mockShares, activeFilter),
    [activeFilter],
  );
  const selectedShare =
    mockShares.find((share) => share.id === selectedShareId) ??
    filteredShares[0] ??
    null;

  function hasFiles(event: DragEvent<HTMLElement>) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    if (!hasFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (!hasFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (!hasFiles(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    if (!hasFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) {
      toast.info("No files were dropped");
      return;
    }

    if (files.length === 1) {
      toast.success(`Ready to share ${files[0]?.name ?? "file"}`, {
        description: "Mock upload only. No file was transferred.",
      });
      return;
    }

    toast.success(`${files.length} files ready to share`, {
      description: "Mock upload only. No files were transferred.",
    });
  }

  return (
    <section
      className="relative flex min-h-[calc(100svh-3rem)] flex-col gap-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <DetailPageHeader
        description={getSharesDescription()}
        status={{
          label: `${summary.activeCount} active`,
          className: "bg-chart-2/20 text-chart-2",
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

        <ShareDetailCard share={selectedShare} />
      </div>

      {isDragActive ? <DropOverlay /> : null}
    </section>
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

function DropOverlay() {
  return (
    <Card className="pointer-events-none absolute inset-0 flex min-h-96 items-center justify-center bg-background/90">
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-none bg-muted">
          <UploadSimpleIcon />
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle>Drop files to create shares</CardTitle>
          <CardDescription>
            Mock upload only. Files will not be transferred yet.
          </CardDescription>
        </div>
      </CardContent>
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

function ShareDetailCard({ share }: { share: ShareDto | null }) {
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
    try {
      await navigator.clipboard.writeText(getShareHref(selectedShare));
      toast.success("Link copied", {
        description: getShareHref(selectedShare),
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
        toast.info("Share revoked");
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{share.fileName}</CardTitle>
            <CardDescription>{share.filePath}</CardDescription>
          </div>
          <Badge className={getShareStatusClassName(share)} variant="secondary">
            {getShareStatusLabel(share)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
        <FilePreview share={share} />

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
                  이 링크는 더 이상 다운로드에 사용할 수 없게 됩니다. 지금은
                  daemon 연결 전이라 액션 골격만 실행됩니다.
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

function FilePreview({ share }: { share: ShareDto }) {
  const PreviewIcon = previewIconByKind[share.preview.kind];

  if (share.preview.thumbnailUrl) {
    return (
      <Card className="aspect-square overflow-hidden">
        <CardContent className="flex h-full flex-col gap-3 p-3">
          <div className="min-h-0 flex-1 overflow-hidden rounded-none bg-muted">
            <img
              alt={`${share.preview.title} preview`}
              className="size-full object-contain"
              src={share.preview.thumbnailUrl}
            />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <PreviewIcon />
              <p className="truncate font-medium text-sm">
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
    <Card className="aspect-square overflow-hidden">
      <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-none bg-muted">
          <PreviewIcon />
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle>{share.preview.title}</CardTitle>
          <CardDescription>
            Preview is not available for {share.preview.extension} files.
          </CardDescription>
        </div>
        <Badge variant="outline">{share.preview.extension}</Badge>
      </CardContent>
    </Card>
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
