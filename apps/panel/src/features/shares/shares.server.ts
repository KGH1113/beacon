import { ListSharesOutputSchema } from "@beacon/shared";

import { fetchDaemonJson } from "@/api-client";
import {
  getDaemonClientBaseUrl,
  getPanelEnv,
  getSharePublicBaseUrl,
} from "@/env";

import { mockShares } from "./shares.lib";

export async function fetchSharesForSsr() {
  const env = getPanelEnv();
  const daemonStreamBaseUrl = getDaemonClientBaseUrl(env);
  const daemonUploadBaseUrl = getDaemonClientBaseUrl(env);
  const daemonPublicBaseUrl = getSharePublicBaseUrl(env);

  try {
    const output = await fetchDaemonJson(
      env.BEACON_DAEMON_URL,
      "/api/v1/share",
      ListSharesOutputSchema,
    );

    return {
      daemonPublicBaseUrl,
      daemonStreamBaseUrl,
      daemonUploadBaseUrl,
      isFallback: false,
      shares: output.shares,
    };
  } catch {
    return {
      daemonPublicBaseUrl,
      daemonStreamBaseUrl,
      daemonUploadBaseUrl,
      isFallback: true,
      shares: mockShares,
    };
  }
}
