import { DashboardPage } from "@/features/dashboard/dashboard.components";
import { fetchSystemOverviewForSsr } from "@/features/system/system.server";

export default async function DashboardRoute() {
  const { daemonStreamBaseUrl, isFallback, overview } =
    await fetchSystemOverviewForSsr();

  return (
    <main className="p-6">
      <DashboardPage
        daemonStreamBaseUrl={daemonStreamBaseUrl}
        isSystemFallback={isFallback}
        systemOverview={overview}
      />
    </main>
  );
}
