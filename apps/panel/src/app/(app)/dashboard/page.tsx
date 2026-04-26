import { DashboardPage } from "@/features/dashboard/dashboard.components";
import { fetchSharesForSsr } from "@/features/shares/shares.server";
import { fetchSystemOverviewForSsr } from "@/features/system/system.server";

export default async function DashboardRoute() {
  const [systemResult, sharesResult] = await Promise.all([
    fetchSystemOverviewForSsr(),
    fetchSharesForSsr(),
  ]);

  return (
    <main className="p-6">
      <DashboardPage
        daemonStreamBaseUrl={systemResult.daemonStreamBaseUrl}
        isSharesFallback={sharesResult.isFallback}
        isSystemFallback={systemResult.isFallback}
        shares={sharesResult.shares}
        systemOverview={systemResult.overview}
      />
    </main>
  );
}
