import { app } from "./app";
import { loadDaemonEnv } from "./config/env";

export function createDaemonServer() {
  return app;
}

export function startDaemon() {
  const env = loadDaemonEnv();

  return app.listen(env.BEACON_DAEMON_PORT);
}

if (import.meta.main) {
  startDaemon();
}

export { app };
