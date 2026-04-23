import { z } from "zod";

import { IdSchema, IsoDatetimeStringSchema } from "../common/entity";

export const ShareDtoSchema = z.object({
  id: IdSchema,
  token: z.string(),
  filePath: z.string(),
  fileName: z.string(),
  expiresAt: IsoDatetimeStringSchema.nullable(),
  createdAt: IsoDatetimeStringSchema.optional(),
  updatedAt: IsoDatetimeStringSchema.optional(),
});

export const ListSharesOutputSchema = z.object({
  shares: z.array(ShareDtoSchema),
});

export const CreateShareInputSchema = z.object({
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  expiresAt: IsoDatetimeStringSchema.nullable().optional(),
});

export const RevokeShareInputSchema = z.object({
  shareId: IdSchema,
});

export type ShareDto = z.infer<typeof ShareDtoSchema>;
export type ListSharesOutput = z.infer<typeof ListSharesOutputSchema>;
export type CreateShareInput = z.infer<typeof CreateShareInputSchema>;
export type RevokeShareInput = z.infer<typeof RevokeShareInputSchema>;
