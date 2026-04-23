"use client";

import { mockSystemOverview } from "./system.lib";

export function useSystemOverview() {
  return {
    data: mockSystemOverview,
    isLoading: false,
    error: null,
  };
}
