import type { ChartConfig } from "@/components/ui/chart";
import type {
  SystemOverviewDto,
  SystemResourceMetricDto,
} from "@beacon/shared";

export const mockSystemOverview = {
  hostname: "beacon-home",
  status: "healthy",
  uptimeLabel: "18d 7h uptime",
  resources: [
    {
      id: "cpu",
      label: "CPU",
      usagePercent: 37,
      detail: "8 cores / 2.4 GHz avg",
    },
    {
      id: "memory",
      label: "RAM",
      usagePercent: 64,
      detail: "20.5 GB of 32 GB",
    },
    {
      id: "storage",
      label: "SSD",
      usagePercent: 72,
      detail: "1.4 TB of 2 TB",
    },
  ],
  networkSamples: [
    { label: "12:00", rxMbps: 12.8, txMbps: 3.2 },
    { label: "12:05", rxMbps: 18.4, txMbps: 5.8 },
    { label: "12:10", rxMbps: 16.1, txMbps: 4.6 },
    { label: "12:15", rxMbps: 24.9, txMbps: 8.7 },
    { label: "12:20", rxMbps: 21.3, txMbps: 6.1 },
    { label: "12:25", rxMbps: 28.6, txMbps: 9.4 },
    { label: "12:30", rxMbps: 19.7, txMbps: 5.5 },
  ],
  openPorts: [
    { port: 22, protocol: "tcp", service: "SSH", exposure: "tailscale" },
    { port: 80, protocol: "tcp", service: "HTTP", exposure: "tunnel" },
    { port: 443, protocol: "tcp", service: "HTTPS", exposure: "tunnel" },
    {
      port: 25565,
      protocol: "tcp",
      service: "Minecraft",
      exposure: "tailscale",
    },
    { port: 3000, protocol: "tcp", service: "Beacon Panel", exposure: "local" },
  ],
} satisfies SystemOverviewDto;

export const systemNetworkChartConfig = {
  rxMbps: {
    label: "RX",
    color: "var(--chart-1)",
  },
  txMbps: {
    label: "TX",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function getSystemDescription() {
  return "호스트 리소스, 네트워크 처리량, 열린 포트를 한 화면에서 확인합니다.";
}

export function getSystemStatusLabel(status: SystemOverviewDto["status"]) {
  const labels = {
    healthy: "Healthy",
    warning: "Watch",
    critical: "Critical",
  } satisfies Record<SystemOverviewDto["status"], string>;

  return labels[status];
}

export function getResourceMetric(
  id: SystemResourceMetricDto["id"],
  overview = mockSystemOverview,
) {
  const metric = overview.resources.find((resource) => resource.id === id);

  if (!metric) {
    throw new Error(`Missing system resource metric: ${id}`);
  }

  return metric;
}

export function getResourceChartConfig(
  metric: SystemResourceMetricDto,
): ChartConfig {
  const colors = {
    cpu: "var(--chart-1)",
    memory: "var(--chart-2)",
    storage: "var(--chart-4)",
  } satisfies Record<SystemResourceMetricDto["id"], string>;

  return {
    usage: {
      label: metric.label,
      color: colors[metric.id],
    },
  } satisfies ChartConfig;
}

export function getResourceGaugeData(metric: SystemResourceMetricDto) {
  return [
    {
      name: metric.label,
      usage: metric.usagePercent,
      fill: "var(--color-usage)",
    },
  ];
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatMbps(value: number) {
  return `${value.toFixed(1)} Mbps`;
}
