import { z } from "zod";

export const LoginInputSchema = z.object({
  password: z.string().min(1),
});

export const SessionDtoSchema = z.object({
  subject: z.string(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
export type SessionDto = z.infer<typeof SessionDtoSchema>;
