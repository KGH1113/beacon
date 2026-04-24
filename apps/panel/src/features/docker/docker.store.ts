"use client";

import { create } from "@/zustand";

type OverlayRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type DockerStore = {
  activeOverlayRect: OverlayRect | null;
  expandedContainerId: string | null;
  shellConnected: boolean;
  selectedContainerId: string | null;
  setActiveOverlayRect: (value: OverlayRect | null) => void;
  setExpandedContainerId: (value: string | null) => void;
  setSelectedContainerId: (value: string | null) => void;
  setShellConnected: (value: boolean) => void;
};

export const useDockerStore = create<DockerStore>((set) => ({
  activeOverlayRect: null,
  expandedContainerId: null,
  shellConnected: false,
  selectedContainerId: null,
  setActiveOverlayRect: (value) => set({ activeOverlayRect: value }),
  setExpandedContainerId: (value) => set({ expandedContainerId: value }),
  setSelectedContainerId: (value) => set({ selectedContainerId: value }),
  setShellConnected: (value) => set({ shellConnected: value }),
}));
