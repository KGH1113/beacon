"use client";

import { mockShares } from "./shares.lib";

export function useShares() {
  return {
    data: mockShares,
    isLoading: false,
    error: null,
  };
}

export function useCreateShare() {
  return {
    isPending: false,
  };
}
