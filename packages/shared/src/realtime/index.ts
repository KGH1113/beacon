import { z } from "zod";

import { IdSchema, IsoDatetimeStringSchema } from "../common/entity";

export const RealtimeEventTypeSchema = z.enum([
  "metrics",
  "docker.logs",
  "docker.exec",
  "minecraft.rcon",
]);

export const RealtimeEventDtoSchema = z.object({
  type: RealtimeEventTypeSchema,
  resourceId: IdSchema.optional(),
  timestamp: IsoDatetimeStringSchema,
  payload: z.unknown(),
});

export type RealtimeEventType = z.infer<typeof RealtimeEventTypeSchema>;
export type RealtimeEventDto = z.infer<typeof RealtimeEventDtoSchema>;
