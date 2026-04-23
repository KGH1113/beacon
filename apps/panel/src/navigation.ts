import { panelRoutes } from "./routes";

export const primaryNavigationItems = [
  { href: panelRoutes.dashboard, label: "Dashboard" },
  { href: panelRoutes.system, label: "System" },
  { href: panelRoutes.docker, label: "Docker" },
  { href: panelRoutes.minecraft, label: "Minecraft" },
  { href: panelRoutes.shares, label: "Shares" },
  { href: panelRoutes.settings, label: "Settings" },
] as const;
