export type PanelSession = {
  authenticated: boolean;
};

export function getDefaultPanelSession(): PanelSession {
  return {
    authenticated: false,
  };
}
