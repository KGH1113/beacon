import { GetSystemOverviewOutputSchema } from "@beacon/shared";

import { fetchDaemonJson } from "@/api-client";
import { getDaemonClientBaseUrl, getPanelEnv } from "@/env";

export async function fetchSystemOverviewForSsr() {
  const env = getPanelEnv();

  try {
    const output = await fetchDaemonJson(
      env.BEACON_DAEMON_URL,
      "/api/v1/system/overview",
      GetSystemOverviewOutputSchema,
    );

    return {
      daemonStreamBaseUrl: getDaemonClientBaseUrl(env),
      isFallback: false,
      overview: output.overview,
    };
  } catch {
    return {
      daemonStreamBaseUrl: getDaemonClientBaseUrl(env),
      isFallback: true,
      overview: undefined,
    };
  }
}
