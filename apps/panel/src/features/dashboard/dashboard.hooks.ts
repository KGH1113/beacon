"use client";

import { mockDashboardModules } from "./dashboard.lib";

export function useDashboardOverview() {
  return {
    data: mockDashboardModules,
    isLoading: false,
    error: null,
  };
}
