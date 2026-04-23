export interface PtyIntegration {
  createSession: () => Promise<{ sessionId: string }>;
}

export function createPtyIntegration(): PtyIntegration {
  return {
    async createSession() {
      return { sessionId: "placeholder-session" };
    },
  };
}
