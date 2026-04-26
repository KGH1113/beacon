"use client";

import type { ShareDto, SystemOverviewDto } from "@beacon/shared";
import type { Icon, IconProps } from "@phosphor-icons/react";
import { CubeIcon, FileIcon, GearSixIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils";

import { useSystemOverviewStream } from "../system/system.hooks";
import {
  type DashboardModule,
  type DashboardModuleSymbol,
  getDashboardDescription,
  getDashboardModules,
} from "./dashboard.lib";

export function DashboardPage({
  daemonStreamBaseUrl,
  isSharesFallback,
  isSystemFallback,
  shares,
  systemOverview,
}: {
  daemonStreamBaseUrl: string;
  isSharesFallback: boolean;
  isSystemFallback: boolean;
  shares: ShareDto[];
  systemOverview?: SystemOverviewDto;
}) {
  const { overview, status } = useSystemOverviewStream(
    systemOverview,
    isSystemFallback,
    daemonStreamBaseUrl,
  );
  const modules = getDashboardModules({
    isSharesFallback,
    isSystemFallback,
    shares,
    systemOverview: overview,
    systemStreamStatus: status,
  });

  return (
    <div
      aria-label={getDashboardDescription()}
      className="grid min-h-[calc(100svh-3rem)] gap-4 md:grid-cols-2"
    >
      {modules.map((module) => (
        <DashboardModuleCard key={module.title} module={module} />
      ))}
    </div>
  );
}

function DashboardModuleCard({
  module,
}: {
  module: DashboardModule;
}) {
  return (
    <Link aria-label={`Open ${module.title}`} href={module.href}>
      <Card className="relative h-full min-h-[300px] transition-colors hover:bg-muted/40">
        <DashboardModuleBackgroundSymbol symbol={module.symbol} />
        <CardHeader className="relative">
          <CardTitle className="text-xl">{module.title}</CardTitle>
          <CardDescription>{module.description}</CardDescription>
          <CardAction>
            <Badge
              className={cn(
                module.statusTone === "success" && "bg-chart-2/20 text-chart-2",
                module.statusTone === "info" && "bg-chart-3/20 text-chart-3",
                module.statusTone === "warning" && "bg-chart-4/20 text-chart-4",
                module.statusTone === "danger" &&
                  "bg-destructive/20 text-destructive",
              )}
              variant="secondary"
            >
              {module.status}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="relative flex flex-1 flex-col justify-end gap-4">
          <div>
            <p className="flex items-baseline gap-2 text-6xl font-semibold tracking-normal">
              <span>{module.primaryValue}</span>
              <span className="text-xl text-muted-foreground">
                {module.primaryUnit}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {module.primaryLabel}
            </p>
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground">
            {module.secondaryMetric}
          </p>
        </CardContent>
        <CardFooter className="relative text-sm text-muted-foreground">
          Open {module.title}
        </CardFooter>
      </Card>
    </Link>
  );
}

function DashboardModuleBackgroundSymbol({
  symbol,
}: {
  symbol: DashboardModuleSymbol;
}) {
  const IconComponent = dashboardModuleSymbols[symbol];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 text-muted-foreground/10 transition-transform group-hover/card:scale-105"
    >
      <IconComponent className="size-56 md:size-64" weight="duotone" />
    </div>
  );
}

const dashboardModuleSymbols = {
  system: GearSixIcon,
  docker: DockerSymbol,
  minecraft: CubeIcon,
  shares: FileIcon,
} satisfies Record<DashboardModuleSymbol, Icon | ComponentType<IconProps>>;

function DockerSymbol({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Docker</title>
      <path
        d="M32 151h128c14 0 27-4 38-12l21-15-1 26h9c8 0 15 4 18 10-8 12-22 19-42 20-17 27-49 41-94 41-44 0-75-15-93-44-7-12 2-26 16-26Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      />
      <path
        d="M58 105h26v26H58zM92 105h26v26H92zM126 105h26v26h-26zM160 105h26v26h-26zM92 72h26v26H92zM126 72h26v26h-26z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="12"
      />
      <path
        d="M207 96c8-17 21-25 40-24-2 21-14 34-35 39"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      />
    </svg>
  );
}
