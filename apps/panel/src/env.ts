import { z } from "zod";

const PanelEnvSchema = z.object({
  BEACON_DAEMON_URL: z.string().url().default("http://kgh:7300"),
  NEXT_PUBLIC_DAEMON_BASE_URL: z.string().url().optional(),
});

export type PanelEnv = z.infer<typeof PanelEnvSchema>;

export function getPanelEnv(): PanelEnv {
  return PanelEnvSchema.parse({
    BEACON_DAEMON_URL: process.env.BEACON_DAEMON_URL,
    NEXT_PUBLIC_DAEMON_BASE_URL: process.env.NEXT_PUBLIC_DAEMON_BASE_URL,
  });
}

export function getDaemonClientBaseUrl(env: PanelEnv = getPanelEnv()) {
  return env.NEXT_PUBLIC_DAEMON_BASE_URL ?? env.BEACON_DAEMON_URL;
}
