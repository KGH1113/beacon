import { app, internalApp, publicShareApp } from "./app";
import { loadDaemonEnv } from "./config/env";

export function createDaemonServer() {
  return {
    internalApp,
    publicShareApp,
  };
}

export function startDaemon() {
  const env = loadDaemonEnv();

  const internalServer = internalApp.listen({
    hostname: env.BEACON_DAEMON_HOST,
    port: env.BEACON_DAEMON_PORT,
  });
  const publicShareServer = publicShareApp.listen({
    hostname: env.BEACON_SHARE_HOST,
    port: env.BEACON_SHARE_PORT,
  });

  return {
    internalServer,
    publicShareServer,
  };
}

if (import.meta.main) {
  startDaemon();
}

export { app };
