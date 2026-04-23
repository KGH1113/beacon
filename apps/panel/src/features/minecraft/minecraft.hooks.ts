"use client";

import { mockMinecraftServers, mockRconOutput } from "./minecraft.lib";

export function useMinecraftServers() {
  return {
    data: mockMinecraftServers,
    isLoading: false,
    error: null,
  };
}

export function useRconConsole() {
  return {
    connected: false,
    lines: mockRconOutput,
  };
}
