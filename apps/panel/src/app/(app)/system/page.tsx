import { GetSystemOverviewOutputSchema } from "@beacon/shared";

import { fetchDaemonJson } from "@/api-client";
import { getDaemonClientBaseUrl, getPanelEnv } from "@/env";
import { SystemOverviewSection } from "@/features/system/system.components";

async function getSystemOverview() {
  try {
    const env = getPanelEnv();
    const output = await fetchDaemonJson(
      env.BEACON_DAEMON_URL,
      "/api/v1/system/overview",
      GetSystemOverviewOutputSchema,
    );

    return {
      overview: output.overview,
      isFallback: false,
    };
  } catch {
    return {
      overview: undefined,
      isFallback: true,
    };
  }
}

export default async function SystemRoute() {
  const { overview, isFallback } = await getSystemOverview();
  const daemonStreamBaseUrl = getDaemonClientBaseUrl();

  return (
    <main className="h-svh overflow-hidden p-6">
      <SystemOverviewSection
        daemonStreamBaseUrl={daemonStreamBaseUrl}
        isFallback={isFallback}
        overview={overview}
      />
    </main>
  );
}
