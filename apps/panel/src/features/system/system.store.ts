"use client";

import { create } from "@/zustand";

type SystemStore = {
  showPorts: boolean;
  setShowPorts: (value: boolean) => void;
};

export const useSystemStore = create<SystemStore>((set) => ({
  showPorts: true,
  setShowPorts: (value) => set({ showPorts: value }),
}));
