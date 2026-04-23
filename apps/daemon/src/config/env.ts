import { z } from "zod";

export const daemonEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  BEACON_DAEMON_HOST: z.string().default("0.0.0.0"),
  BEACON_DAEMON_PORT: z.coerce.number().int().positive().default(7300),
});

export type DaemonEnv = z.infer<typeof daemonEnvSchema>;

export function loadDaemonEnv(
  source: Record<string, string | undefined> = process.env,
) {
  return daemonEnvSchema.parse(source);
}
