import { z } from "zod";

export const PaginationMetaDtoSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export type PaginationMetaDto = z.infer<typeof PaginationMetaDtoSchema>;
