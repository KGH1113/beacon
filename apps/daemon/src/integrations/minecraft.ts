export interface MinecraftIntegration {
  listServers: () => Promise<unknown[]>;
}

export function createMinecraftIntegration(): MinecraftIntegration {
  return {
    async listServers() {
      return [];
    },
  };
}
