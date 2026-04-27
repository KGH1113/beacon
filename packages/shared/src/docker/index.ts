import { z } from "zod";

import { IdSchema, IsoDatetimeStringSchema } from "../common/entity";

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

export const ControlDockerContainerOutputSchema = z.object({
  container: DockerContainerDtoSchema,
});

export const DockerContainersRealtimeEventDtoSchema = z.object({
  type: z.literal("docker.containers.snapshot"),
  timestamp: IsoDatetimeStringSchema,
  payload: ListDockerContainersOutputSchema,
});

export const DockerLogEventDtoSchema = z.object({
  type: z.literal("docker.log"),
  timestamp: IsoDatetimeStringSchema,
  payload: z.object({
    containerId: IdSchema,
    line: z.string(),
    stream: z.enum(["stdout", "stderr"]),
  }),
});

export const DockerExecInputDtoSchema = z.object({
  type: z.literal("docker.exec.input"),
  payload: z.object({
    data: z.string(),
  }),
});

export const DockerExecOutputDtoSchema = z.object({
  type: z.literal("docker.exec.output"),
  timestamp: IsoDatetimeStringSchema,
  payload: z.object({
    data: z.string(),
    stream: z.enum(["stdout", "stderr", "system"]),
  }),
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
export type ControlDockerContainerOutput = z.infer<
  typeof ControlDockerContainerOutputSchema
>;
export type DockerContainersRealtimeEventDto = z.infer<
  typeof DockerContainersRealtimeEventDtoSchema
>;
export type DockerLogEventDto = z.infer<typeof DockerLogEventDtoSchema>;
export type DockerExecInputDto = z.infer<typeof DockerExecInputDtoSchema>;
export type DockerExecOutputDto = z.infer<typeof DockerExecOutputDtoSchema>;
