"use client";

import { create } from "@/zustand";

type DockerStore = {
  selectedContainerId: string | null;
  setSelectedContainerId: (value: string | null) => void;
};

export const useDockerStore = create<DockerStore>((set) => ({
  selectedContainerId: null,
  setSelectedContainerId: (value) => set({ selectedContainerId: value }),
}));
