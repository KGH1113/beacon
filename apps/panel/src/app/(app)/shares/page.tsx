import { SharesPage } from "@/features/shares/shares.components";
import { fetchSharesForSsr } from "@/features/shares/shares.server";

export default async function SharesRoute() {
  const { daemonPublicBaseUrl, isFallback, shares } = await fetchSharesForSsr();

  return (
    <main className="min-h-svh p-6">
      <SharesPage
        daemonPublicBaseUrl={daemonPublicBaseUrl}
        initialShares={shares}
        isFallback={isFallback}
      />
    </main>
  );
}
