"use client";

import type {
  SystemOpenPortDto,
  SystemOverviewDto,
  SystemResourceMetricDto,
} from "@beacon/shared";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";

import { DetailPageHeader } from "@/components/detail-page-header";
import { SummaryMetric } from "@/components/summary-metric";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils";

import {
  formatMbps,
  formatPercent,
  getResourceChartConfig,
  getResourceGaugeData,
  getSystemDescription,
  getSystemStatusLabel,
  mockSystemOverview,
  systemNetworkChartConfig,
} from "./system.lib";

export function SystemOverviewSection({
  overview = mockSystemOverview,
  isFallback = false,
}: {
  overview?: SystemOverviewDto;
  isFallback?: boolean;
}) {
  const latestNetworkSample = overview.networkSamples.at(-1) ??
    overview.networkSamples[0] ?? {
      label: "now",
      rxMbps: 0,
      txMbps: 0,
    };
  const description = isFallback
    ? `${getSystemDescription()} daemon 연결 실패로 mock data를 표시합니다.`
    : getSystemDescription();

  return (
    <section className="flex flex-col gap-4">
      <DetailPageHeader
        description={description}
        status={{
          label: isFallback ? "Mock" : getSystemStatusLabel(overview.status),
          className: cn(
            overview.status === "healthy" &&
              !isFallback &&
              "bg-chart-2/20 text-chart-2",
            overview.status === "warning" &&
              !isFallback &&
              "bg-chart-4/20 text-chart-4",
            overview.status === "critical" &&
              !isFallback &&
              "bg-destructive/20 text-destructive",
            isFallback && "bg-chart-4/20 text-chart-4",
          ),
        }}
        title="System"
      />

      <Card>
        <CardContent className="flex min-w-0 items-start gap-4 overflow-x-auto">
          <SummaryMetric
            className="min-w-32 flex-1"
            label="Uptime"
            value={overview.uptimeLabel}
          />
          <SummaryMetric
            className="min-w-32 flex-1"
            label="RX"
            value={formatMbps(latestNetworkSample.rxMbps)}
          />
          <SummaryMetric
            className="min-w-32 flex-1"
            label="TX"
            value={formatMbps(latestNetworkSample.txMbps)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {overview.resources.map((metric) => (
          <ResourceGaugeCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <NetworkThroughputCard overview={overview} />
        <OpenPortsCard overview={overview} />
      </div>
    </section>
  );
}

function ResourceGaugeCard({ metric }: { metric: SystemResourceMetricDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{metric.label}</CardTitle>
        <CardDescription>{metric.detail}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer
          className="mx-auto aspect-square max-h-[230px]"
          config={getResourceChartConfig(metric)}
        >
          <RadialBarChart
            data={getResourceGaugeData(metric)}
            endAngle={90 - metric.usagePercent * 3.6}
            innerRadius={72}
            outerRadius={104}
            startAngle={90}
          >
            <PolarGrid
              className="fill-muted"
              gridType="circle"
              polarRadius={[82, 70]}
              radialLines={false}
              stroke="none"
            />
            <RadialBar background cornerRadius={8} dataKey="usage" />
            <PolarRadiusAxis axisLine={false} tick={false} tickLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        dominantBaseline="middle"
                        textAnchor="middle"
                        x={viewBox.cx}
                        y={viewBox.cy}
                      >
                        <tspan
                          className="fill-foreground font-semibold text-3xl"
                          x={viewBox.cx}
                          y={viewBox.cy}
                        >
                          {formatPercent(metric.usagePercent)}
                        </tspan>
                        <tspan
                          className="fill-muted-foreground text-xs"
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 24}
                        >
                          used
                        </tspan>
                      </text>
                    );
                  }

                  return null;
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
        <Separator />
        <p className="text-muted-foreground text-sm">
          {metric.label} usage is currently {formatPercent(metric.usagePercent)}
          .
        </p>
      </CardContent>
    </Card>
  );
}

function NetworkThroughputCard({ overview }: { overview: SystemOverviewDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Network</CardTitle>
        <CardDescription>Recent RX/TX throughput in Mbps</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className="h-[300px] w-full"
          config={systemNetworkChartConfig}
        >
          <AreaChart
            accessibilityLayer
            data={overview.networkSamples}
            margin={{ left: 0, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickFormatter={(value) => `${value}`}
              tickLine={false}
              tickMargin={8}
              width={36}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
              cursor={false}
            />
            <Area
              dataKey="rxMbps"
              fill="var(--color-rxMbps)"
              fillOpacity={0.2}
              stroke="var(--color-rxMbps)"
              type="natural"
            />
            <Area
              dataKey="txMbps"
              fill="var(--color-txMbps)"
              fillOpacity={0.18}
              stroke="var(--color-txMbps)"
              type="natural"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function OpenPortsCard({ overview }: { overview: SystemOverviewDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Ports</CardTitle>
        <CardDescription>
          Listening services visible to the host
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Port</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Scope</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overview.openPorts.map((port) => (
              <TableRow key={`${port.protocol}-${port.port}`}>
                <TableCell className="font-medium">
                  {port.port}/{port.protocol}
                </TableCell>
                <TableCell>{port.service}</TableCell>
                <TableCell className="text-right">
                  <ExposureBadge port={port} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ExposureBadge({ port }: { port: SystemOpenPortDto }) {
  return (
    <Badge
      className={cn(
        port.exposure === "local" && "bg-muted text-muted-foreground",
        port.exposure === "tailscale" && "bg-chart-2/20 text-chart-2",
        port.exposure === "tunnel" && "bg-chart-3/20 text-chart-3",
        port.exposure === "public" && "bg-destructive/20 text-destructive",
      )}
      variant="secondary"
    >
      {port.exposure}
    </Badge>
  );
}
