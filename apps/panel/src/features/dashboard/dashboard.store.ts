"use client";

import { create } from "@/zustand";

type DashboardStore = {
  compactMode: boolean;
  setCompactMode: (value: boolean) => void;
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  compactMode: false,
  setCompactMode: (value) => set({ compactMode: value }),
}));
