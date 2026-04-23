export interface TailscaleIntegration {
  getStatus: () => Promise<Record<string, unknown>>;
}

export function createTailscaleIntegration(): TailscaleIntegration {
  return {
    async getStatus() {
      return {};
    },
  };
}
