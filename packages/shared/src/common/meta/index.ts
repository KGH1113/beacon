import { z } from "zod";

export const ApiMetaDtoSchema = z.object({
  requestId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export type ApiMetaDto = z.infer<typeof ApiMetaDtoSchema>;
