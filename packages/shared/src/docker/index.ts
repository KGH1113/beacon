import { z } from "zod";

import { IdSchema } from "../common/entity";

export const DockerContainerStateSchema = z.enum([
  "running",
  "exited",
  "restarting",
]);

export const DockerContainerMetricDtoSchema = z.object({
  cpuPercent: z.number().min(0),
  memoryUsageLabel: z.string(),
  memoryPercent: z.number().min(0),
  networkRxLabel: z.string(),
  networkTxLabel: z.string(),
});

export const DockerContainerPortDtoSchema = z.object({
  privatePort: z.number().int().positive(),
  publicPort: z.number().int().positive().nullable(),
  protocol: z.string(),
});

export const DockerContainerDtoSchema = z.object({
  id: IdSchema,
  name: z.string(),
  image: z.string(),
  state: DockerContainerStateSchema,
  status: z.string(),
  project: z.string(),
  uptimeLabel: z.string(),
  defaultShell: z.string(),
  metrics: DockerContainerMetricDtoSchema,
  ports: z.array(DockerContainerPortDtoSchema),
  recentLogs: z.array(z.string()),
});

export const ListDockerContainersOutputSchema = z.object({
  containers: z.array(DockerContainerDtoSchema),
});

export const ControlDockerContainerInputSchema = z.object({
  containerId: IdSchema,
  action: z.enum(["start", "stop", "restart"]),
});

export type DockerContainerDto = z.infer<typeof DockerContainerDtoSchema>;
export type DockerContainerMetricDto = z.infer<
  typeof DockerContainerMetricDtoSchema
>;
export type DockerContainerPortDto = z.infer<
  typeof DockerContainerPortDtoSchema
>;
export type DockerContainerState = z.infer<typeof DockerContainerStateSchema>;
export type ListDockerContainersOutput = z.infer<
  typeof ListDockerContainersOutputSchema
>;
export type ControlDockerContainerInput = z.infer<
  typeof ControlDockerContainerInputSchema
>;
