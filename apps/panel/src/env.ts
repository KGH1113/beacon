import { z } from "zod";

const PanelEnvSchema = z.object({
  NEXT_PUBLIC_DAEMON_BASE_URL: z.string().url().optional(),
});

export type PanelEnv = z.infer<typeof PanelEnvSchema>;

export function getPanelEnv(): PanelEnv {
  return PanelEnvSchema.parse({
    NEXT_PUBLIC_DAEMON_BASE_URL: process.env.NEXT_PUBLIC_DAEMON_BASE_URL,
  });
}
