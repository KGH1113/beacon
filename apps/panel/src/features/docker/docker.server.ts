import { ListDockerContainersOutputSchema } from "@beacon/shared";

import { fetchDaemonJson } from "@/api-client";
import { getDaemonClientBaseUrl, getPanelEnv } from "@/env";

import { mockDockerContainers } from "./docker.lib";

export async function fetchDockerContainersForSsr() {
  const env = getPanelEnv();
  const daemonBaseUrl = getDaemonClientBaseUrl(env);

  try {
    const output = await fetchDaemonJson(
      env.BEACON_DAEMON_URL,
      "/api/v1/docker/containers",
      ListDockerContainersOutputSchema,
    );

    return {
      containers: output.containers,
      daemonBaseUrl,
      isFallback: false,
    };
  } catch {
    return {
      containers: mockDockerContainers,
      daemonBaseUrl,
      isFallback: true,
    };
  }
}
