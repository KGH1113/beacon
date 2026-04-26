import { SystemOverviewSection } from "@/features/system/system.components";
import { fetchSystemOverviewForSsr } from "@/features/system/system.server";

export default async function SystemRoute() {
  const { daemonStreamBaseUrl, isFallback, overview } =
    await fetchSystemOverviewForSsr();

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
