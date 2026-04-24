"use client";

import { create } from "@/zustand";

import type { ShareFilter } from "./shares.lib";

type SharesStore = {
  activeFilter: ShareFilter;
  selectedShareId: string | null;
  setActiveFilter: (value: ShareFilter) => void;
  setSelectedShareId: (value: string | null) => void;
};

export const useSharesStore = create<SharesStore>((set) => ({
  activeFilter: "all",
  selectedShareId: null,
  setActiveFilter: (value) => set({ activeFilter: value }),
  setSelectedShareId: (value) => set({ selectedShareId: value }),
}));
