"use client";

import { mockDockerContainers, mockDockerLogs } from "./docker.lib";

export function useDockerContainers() {
  return {
    data: mockDockerContainers,
    isLoading: false,
    error: null,
  };
}

export function useDockerLogs() {
  return {
    lines: mockDockerLogs,
    isStreaming: false,
  };
}

export function useDockerExec() {
  return {
    connected: false,
  };
}
