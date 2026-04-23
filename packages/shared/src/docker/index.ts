import { z } from "zod";

import { IdSchema } from "../common/entity";

export const DockerContainerDtoSchema = z.object({
  id: IdSchema,
  name: z.string(),
  image: z.string(),
  state: z.string(),
  status: z.string(),
});

export const ListDockerContainersOutputSchema = z.object({
  containers: z.array(DockerContainerDtoSchema),
});

export const ControlDockerContainerInputSchema = z.object({
  containerId: IdSchema,
  action: z.enum(["start", "stop", "restart"]),
});

export type DockerContainerDto = z.infer<typeof DockerContainerDtoSchema>;
export type ListDockerContainersOutput = z.infer<
  typeof ListDockerContainersOutputSchema
>;
export type ControlDockerContainerInput = z.infer<
  typeof ControlDockerContainerInputSchema
>;
