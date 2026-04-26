import { z } from "zod";

export const SystemResourceMetricDtoSchema = z.object({
  id: z.enum(["cpu", "memory", "storage"]),
  label: z.string(),
  usagePercent: z.number().min(0).max(100),
  detail: z.string(),
});

export const SystemNetworkSampleDtoSchema = z.object({
  label: z.string(),
  timestampMs: z.number().int().nonnegative().optional(),
  rxMbps: z.number().min(0),
  txMbps: z.number().min(0),
});

export const SystemOpenPortDtoSchema = z.object({
  port: z.number().int().min(1).max(65_535),
  protocol: z.enum(["tcp", "udp"]),
  service: z.string(),
  exposure: z.enum(["local", "tailscale", "tunnel", "public"]),
});

export const SystemOverviewDtoSchema = z.object({
  hostname: z.string(),
  status: z.enum(["healthy", "warning", "critical"]),
  uptimeLabel: z.string(),
  resources: z.array(SystemResourceMetricDtoSchema),
  networkSamples: z.array(SystemNetworkSampleDtoSchema),
  openPorts: z.array(SystemOpenPortDtoSchema),
});

export const GetSystemOverviewOutputSchema = z.object({
  overview: SystemOverviewDtoSchema,
});

export type SystemResourceMetricDto = z.infer<
  typeof SystemResourceMetricDtoSchema
>;
export type SystemNetworkSampleDto = z.infer<
  typeof SystemNetworkSampleDtoSchema
>;
export type SystemOpenPortDto = z.infer<typeof SystemOpenPortDtoSchema>;
export type SystemOverviewDto = z.infer<typeof SystemOverviewDtoSchema>;
export type GetSystemOverviewOutput = z.infer<
  typeof GetSystemOverviewOutputSchema
>;
