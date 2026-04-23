"use client";

import { create } from "@/zustand";

type SharesStore = {
  selectedShareId: string | null;
  setSelectedShareId: (value: string | null) => void;
};

export const useSharesStore = create<SharesStore>((set) => ({
  selectedShareId: null,
  setSelectedShareId: (value) => set({ selectedShareId: value }),
}));
