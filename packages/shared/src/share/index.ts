import { z } from "zod";

import { IdSchema, IsoDatetimeStringSchema } from "../common/entity";

export const ShareStatusSchema = z.enum(["active", "revoked"]);

export const SharePreviewKindSchema = z.enum([
  "image",
  "video",
  "document",
  "file",
]);

export const SharePreviewDtoSchema = z.object({
  kind: SharePreviewKindSchema,
  extension: z.string(),
  thumbnailUrl: z.string().nullable(),
  title: z.string(),
});

export const ShareDtoSchema = z.object({
  id: IdSchema,
  token: z.string(),
  filePath: z.string(),
  fileName: z.string(),
  sizeLabel: z.string(),
  downloadCount: z.number().int().nonnegative(),
  status: ShareStatusSchema,
  preview: SharePreviewDtoSchema,
  expiresAt: IsoDatetimeStringSchema.nullable(),
  createdAt: IsoDatetimeStringSchema.optional(),
  updatedAt: IsoDatetimeStringSchema.optional(),
});

export const ListSharesOutputSchema = z.object({
  shares: z.array(ShareDtoSchema),
});

export const UploadShareMetadataSchema = z.object({
  expiresAt: IsoDatetimeStringSchema.nullable().optional(),
});

export const UploadShareOutputSchema = z.object({
  share: ShareDtoSchema,
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
export type SharePreviewDto = z.infer<typeof SharePreviewDtoSchema>;
export type SharePreviewKind = z.infer<typeof SharePreviewKindSchema>;
export type ShareStatus = z.infer<typeof ShareStatusSchema>;
export type ListSharesOutput = z.infer<typeof ListSharesOutputSchema>;
export type UploadShareMetadata = z.infer<typeof UploadShareMetadataSchema>;
export type UploadShareOutput = z.infer<typeof UploadShareOutputSchema>;
export type CreateShareInput = z.infer<typeof CreateShareInputSchema>;
export type RevokeShareInput = z.infer<typeof RevokeShareInputSchema>;
