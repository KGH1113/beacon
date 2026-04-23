import { z } from "zod";

export const IdSchema = z.string().min(1);
export const IsoDatetimeStringSchema = z.string().datetime();

export const EntityMetaDtoSchema = z.object({
  createdAt: IsoDatetimeStringSchema.optional(),
  updatedAt: IsoDatetimeStringSchema.optional(),
});

export type Id = z.infer<typeof IdSchema>;
export type IsoDatetimeString = z.infer<typeof IsoDatetimeStringSchema>;
export type EntityMetaDto = z.infer<typeof EntityMetaDtoSchema>;
