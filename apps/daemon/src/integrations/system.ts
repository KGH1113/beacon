export interface SystemIntegration {
  readOverview: () => Promise<Record<string, unknown>>;
}

export function createSystemIntegration(): SystemIntegration {
  return {
    async readOverview() {
      return {};
    },
  };
}
