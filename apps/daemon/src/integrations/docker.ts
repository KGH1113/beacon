export interface DockerIntegration {
  listContainers: () => Promise<unknown[]>;
}

export function createDockerIntegration(): DockerIntegration {
  return {
    async listContainers() {
      return [];
    },
  };
}
