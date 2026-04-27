import { DockerPage } from "@/features/docker/docker.components";
import { fetchDockerContainersForSsr } from "@/features/docker/docker.server";

export default async function DockerRoute() {
  const { containers, daemonBaseUrl, isFallback } =
    await fetchDockerContainersForSsr();

  return (
    <main className="min-h-svh p-6">
      <DockerPage
        daemonBaseUrl={daemonBaseUrl}
        initialContainers={containers}
        isFallback={isFallback}
      />
    </main>
  );
}
