"use client";

import type { DockerContainerDto } from "@beacon/shared";
import {
  ArrowClockwiseIcon,
  CpuIcon,
  HardDrivesIcon,
  NetworkIcon,
  PlayIcon,
  PlugIcon,
  StopIcon,
  TerminalIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import { motion } from "motion/react";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { DetailPageHeader } from "@/components/detail-page-header";
import { SummaryMetric } from "@/components/summary-metric";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils";

import { controlDockerContainerAction } from "./docker.actions";
import {
  useDockerContainersStream,
  useDockerExecSession,
  useDockerLogs,
} from "./docker.hooks";
import {
  formatDockerPort,
  getDockerDescription,
  getDockerStateClassName,
  getDockerStateLabel,
  getDockerSummary,
} from "./docker.lib";
import { useDockerStore } from "./docker.store";

export function DockerPage({
  daemonBaseUrl,
  initialContainers,
  isFallback,
}: {
  daemonBaseUrl: string;
  initialContainers: DockerContainerDto[];
  isFallback: boolean;
}) {
  const { containers } = useDockerContainersStream(
    initialContainers,
    isFallback,
    daemonBaseUrl,
  );
  const activeOverlayRect = useDockerStore((state) => state.activeOverlayRect);
  const expandedContainerId = useDockerStore(
    (state) => state.expandedContainerId,
  );
  const selectedContainerId = useDockerStore(
    (state) => state.selectedContainerId,
  );
  const setActiveOverlayRect = useDockerStore(
    (state) => state.setActiveOverlayRect,
  );
  const setExpandedContainerId = useDockerStore(
    (state) => state.setExpandedContainerId,
  );
  const setSelectedContainerId = useDockerStore(
    (state) => state.setSelectedContainerId,
  );
  const setShellConnected = useDockerStore((state) => state.setShellConnected);
  const [isOverlayExpanded, setOverlayExpanded] = useState(false);

  const summary = getDockerSummary(containers);
  const selectedContainer =
    containers.find((container) => container.id === selectedContainerId) ??
    null;
  const expandedContainer =
    containers.find((container) => container.id === expandedContainerId) ??
    null;

  useEffect(() => {
    if (!expandedContainerId) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      setOverlayExpanded(true);
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [expandedContainerId]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeOverlay();
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  });

  function openContainer(
    container: DockerContainerDto,
    event: MouseEvent<HTMLElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();

    setActiveOverlayRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    setOverlayExpanded(false);
    setShellConnected(false);
    setSelectedContainerId(container.id);
    setExpandedContainerId(container.id);
  }

  function closeOverlay() {
    if (!expandedContainerId) {
      return;
    }

    setOverlayExpanded(false);
    setShellConnected(false);

    window.setTimeout(() => {
      setExpandedContainerId(null);
      setActiveOverlayRect(null);
    }, 360);
  }

  return (
    <section className="relative flex min-h-[calc(100svh-3rem)] flex-col gap-4">
      <DetailPageHeader
        description={
          isFallback
            ? `${getDockerDescription()} Daemon 연결 실패로 mock data를 표시 중입니다.`
            : getDockerDescription()
        }
        status={{
          label: isFallback ? "Mock" : `${summary.runningCount} running`,
          className: isFallback
            ? "bg-chart-5/20 text-chart-5"
            : "bg-chart-2/20 text-chart-2",
        }}
        title="Docker"
      />

      <Card>
        <CardContent className="flex min-w-0 items-start gap-4 overflow-x-auto">
          <SummaryMetric
            className="min-w-32 flex-1"
            label="Running"
            value={summary.runningCount}
          />
          <SummaryMetric
            className="min-w-32 flex-1"
            label="Stopped"
            value={summary.stoppedCount}
          />
          <SummaryMetric
            className="min-w-32 flex-1"
            label="Images"
            value={summary.imageCount}
          />
          <SummaryMetric
            className="min-w-32 flex-1"
            label="Open ports"
            value={summary.openPortCount}
          />
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 md:grid-cols-3 xl:grid-cols-3">
        {containers.map((container) => (
          <ContainerGridCard
            container={container}
            isSelected={selectedContainer?.id === container.id}
            key={container.id}
            onOpen={openContainer}
          />
        ))}
      </div>

      {expandedContainer && activeOverlayRect ? (
        <ContainerWorkspaceOverlay
          container={expandedContainer}
          daemonBaseUrl={daemonBaseUrl}
          isExpanded={isOverlayExpanded}
          onClose={closeOverlay}
          originRect={activeOverlayRect}
        />
      ) : null}
    </section>
  );
}

function ContainerGridCard({
  container,
  isSelected,
  onOpen,
}: {
  container: DockerContainerDto;
  isSelected: boolean;
  onOpen: (
    container: DockerContainerDto,
    event: MouseEvent<HTMLElement>,
  ) => void;
}) {
  return (
    <Card
      className={cn(
        "group cursor-pointer transition-transform hover:-translate-y-1",
        isSelected && "bg-muted/50",
      )}
      onClick={(event) => onOpen(container, event)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="truncate">{container.name}</CardTitle>
            <CardDescription className="truncate">
              {container.image}
            </CardDescription>
          </div>
          <Badge
            className={getDockerStateClassName(container.state)}
            variant="secondary"
          >
            {getDockerStateLabel(container.state)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <ContainerMetric
            icon={<CpuIcon />}
            label="CPU"
            value={`${container.metrics.cpuPercent}%`}
          />
          <ContainerMetric
            icon={<HardDrivesIcon />}
            label="RAM"
            value={`${container.metrics.memoryPercent}%`}
          />
          <ContainerMetric
            icon={<NetworkIcon />}
            label="RX"
            value={container.metrics.networkRxLabel}
          />
          <ContainerMetric
            icon={<PlugIcon />}
            label="Ports"
            value={`${container.ports.length}`}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{container.project}</span>
          <span>{container.status}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ContainerMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-8 items-center justify-center rounded-none bg-muted">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="truncate font-medium text-sm">{value}</span>
      </div>
    </div>
  );
}

function ContainerWorkspaceOverlay({
  container,
  daemonBaseUrl,
  isExpanded,
  onClose,
  originRect,
}: {
  container: DockerContainerDto;
  daemonBaseUrl: string;
  isExpanded: boolean;
  onClose: () => void;
  originRect: { top: number; left: number; width: number; height: number };
}) {
  const [workspaceRect, setWorkspaceRect] = useState(() =>
    getWorkspaceRect(originRect),
  );
  const [isWorkspaceReady, setWorkspaceReady] = useState(false);

  useEffect(() => {
    function syncWorkspaceRect() {
      setWorkspaceRect(getWorkspaceRect(originRect));
    }

    syncWorkspaceRect();
    window.addEventListener("resize", syncWorkspaceRect);

    return () => window.removeEventListener("resize", syncWorkspaceRect);
  }, [originRect]);

  useEffect(() => {
    if (!isExpanded) {
      setWorkspaceReady(false);
    }
  }, [isExpanded]);

  const overlayStyle = isExpanded ? workspaceRect : originRect;

  return (
    <motion.div
      animate={{ opacity: isExpanded ? 1 : 0 }}
      className="fixed inset-0 z-50 bg-background/80"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        animate={overlayStyle}
        className="fixed"
        initial={originRect}
        onAnimationComplete={() => {
          if (isExpanded) {
            setWorkspaceReady(true);
          }
        }}
        transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
      >
        <Card className="flex size-full min-h-0 flex-col overflow-hidden">
          <WorkspaceHeader container={container} onClose={onClose} />
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto p-0 xl:grid xl:grid-cols-[420px_minmax(0,1fr)] xl:items-stretch xl:overflow-hidden">
            <ContainerOverview
              container={container}
              daemonBaseUrl={daemonBaseUrl}
              isWorkspaceReady={isWorkspaceReady}
            />
            <ContainerShell
              container={container}
              daemonBaseUrl={daemonBaseUrl}
              isWorkspaceReady={isWorkspaceReady}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function getWorkspaceRect(originRect: {
  top: number;
  left: number;
  width: number;
  height: number;
}) {
  if (typeof window === "undefined") {
    return originRect;
  }

  return {
    top: 24,
    left: 24,
    width: Math.max(window.innerWidth - 48, originRect.width),
    height: Math.max(window.innerHeight - 48, originRect.height),
  };
}

function WorkspaceHeader({
  container,
  onClose,
}: {
  container: DockerContainerDto;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function controlContainer(action: "start" | "stop" | "restart") {
    startTransition(async () => {
      const result = await controlDockerContainerAction({
        containerId: container.id,
        action,
      });

      if (result.ok) {
        toast.success(`${container.name} ${action} requested`);
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <CardTitle className="truncate text-2xl">{container.name}</CardTitle>
          <Badge
            className={getDockerStateClassName(container.state)}
            variant="secondary"
          >
            {getDockerStateLabel(container.state)}
          </Badge>
        </div>
        <CardDescription className="truncate">
          {container.image} · {container.project} · {container.status}
        </CardDescription>
      </div>
      <div className="flex w-full items-center gap-2 md:w-auto">
        <Button
          className="flex-1 md:flex-none"
          disabled={isPending}
          onClick={() => controlContainer("start")}
          type="button"
          variant="outline"
        >
          <PlayIcon data-icon="inline-start" />
          Start
        </Button>
        <Button
          className="flex-1 md:flex-none"
          disabled={isPending}
          onClick={() => controlContainer("stop")}
          type="button"
          variant="outline"
        >
          <StopIcon data-icon="inline-start" />
          Stop
        </Button>
        <Button
          className="flex-1 md:flex-none"
          disabled={isPending}
          onClick={() => controlContainer("restart")}
          type="button"
          variant="outline"
        >
          <ArrowClockwiseIcon data-icon="inline-start" />
          Restart
        </Button>
        <Button
          aria-label="Close docker workspace"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <XIcon />
        </Button>
      </div>
    </CardHeader>
  );
}

function ContainerOverview({
  container,
  daemonBaseUrl,
  isWorkspaceReady,
}: {
  container: DockerContainerDto;
  daemonBaseUrl: string;
  isWorkspaceReady: boolean;
}) {
  const { lines } = useDockerLogs(
    container.id,
    container.recentLogs,
    isWorkspaceReady,
    daemonBaseUrl,
  );

  return (
    <section className="flex flex-none flex-col border-b p-4 xl:h-full xl:min-h-0 xl:border-r xl:border-b-0">
      <div className="flex flex-col gap-1">
        <CardTitle>Overview</CardTitle>
        <CardDescription>
          Resources, ports, and recent log tail for this container.
        </CardDescription>
      </div>
      <div className="flex flex-col gap-4 pt-4 xl:min-h-0 xl:flex-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <OverviewItem label="Uptime" value={container.uptimeLabel} />
          <OverviewItem label="Shell" value={container.defaultShell} />
          <OverviewItem
            label="Memory"
            value={container.metrics.memoryUsageLabel}
          />
          <OverviewItem
            label="Network"
            value={`${container.metrics.networkRxLabel} / ${container.metrics.networkTxLabel}`}
          />
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          <p className="font-medium text-sm">Ports</p>
          <div className="flex flex-wrap gap-2">
            {container.ports.length > 0 ? (
              container.ports.map((port) => (
                <Badge
                  key={`${port.privatePort}-${port.publicPort ?? "internal"}`}
                  variant="outline"
                >
                  {formatDockerPort(port)}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">No exposed ports</Badge>
            )}
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          <p className="font-medium text-sm">Recent logs</p>
          <ScrollArea className="max-h-48 rounded-none bg-muted p-3 xl:min-h-0 xl:max-h-none xl:flex-1">
            <div className="flex flex-col gap-2 font-mono text-xs">
              {lines.map((line) => (
                <p key={line.id}>{line.line}</p>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </section>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}

function ContainerShell({
  container,
  daemonBaseUrl,
  isWorkspaceReady,
}: {
  container: DockerContainerDto;
  daemonBaseUrl: string;
  isWorkspaceReady: boolean;
}) {
  const shellConnected = useDockerStore((state) => state.shellConnected);
  const { connected, terminalRef } = useDockerExecSession(
    container,
    daemonBaseUrl,
    isWorkspaceReady,
  );
  const isConnected = connected || shellConnected;

  return (
    <section className="flex min-h-[520px] min-w-0 flex-none flex-col p-4 xl:h-full xl:min-h-0 xl:flex-1">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            <TerminalIcon />
            Shell
          </CardTitle>
          <CardDescription>
            Container shell bridged through daemon websocket.
          </CardDescription>
        </div>
        <Badge
          className={
            isConnected
              ? "bg-chart-2/20 text-chart-2"
              : "bg-chart-5/20 text-chart-5"
          }
          variant="secondary"
        >
          {isConnected ? "Connected" : "Connecting"}
        </Badge>
      </div>
      <div className="min-h-0 flex-1 pt-4">
        <div className="h-full min-h-[320px] overflow-hidden rounded-none bg-black p-3">
          {isWorkspaceReady ? (
            <div className="h-full overflow-hidden" ref={terminalRef} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
