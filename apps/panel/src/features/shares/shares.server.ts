import { ListSharesOutputSchema } from "@beacon/shared";

import { fetchDaemonJson } from "@/api-client";
import { getDaemonClientBaseUrl, getPanelEnv } from "@/env";

import { mockShares } from "./shares.lib";

export async function fetchSharesForSsr() {
  const env = getPanelEnv();
  const daemonPublicBaseUrl = getDaemonClientBaseUrl(env);

  try {
    const output = await fetchDaemonJson(
      env.BEACON_DAEMON_URL,
      "/api/v1/share",
      ListSharesOutputSchema,
    );

    return {
      daemonPublicBaseUrl,
      isFallback: false,
      shares: output.shares,
    };
  } catch {
    return {
      daemonPublicBaseUrl,
      isFallback: true,
      shares: mockShares,
    };
  }
}
