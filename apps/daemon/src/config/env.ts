import { z } from "zod";

export const NO_REQUEST_BODY_LIMIT_BYTES = Number.MAX_SAFE_INTEGER;

export const daemonEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  BEACON_DAEMON_HOST: z.string().default("0.0.0.0"),
  BEACON_DAEMON_PORT: z.coerce.number().int().positive().default(7300),
  BEACON_DAEMON_MAX_REQUEST_BODY_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(NO_REQUEST_BODY_LIMIT_BYTES),
  BEACON_SHARE_HOST: z.string().default("127.0.0.1"),
  BEACON_SHARE_PORT: z.coerce.number().int().positive().default(7301),
  BEACON_SHARE_ROOTS_CONFIG: z.string().optional(),
});

export type DaemonEnv = z.infer<typeof daemonEnvSchema>;

export function loadDaemonEnv(
  source: Record<string, string | undefined> = process.env,
) {
  return daemonEnvSchema.parse(source);
}
