import { GetSystemOverviewOutputSchema } from "@beacon/shared";

import { fetchDaemonJson } from "@/api-client";
import { getPanelEnv } from "@/env";
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

  return (
    <main className="p-6">
      <SystemOverviewSection isFallback={isFallback} overview={overview} />
    </main>
  );
}
