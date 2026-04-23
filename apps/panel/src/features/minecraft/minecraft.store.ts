"use client";

import { create } from "@/zustand";

type MinecraftStore = {
  selectedServerId: string | null;
  setSelectedServerId: (value: string | null) => void;
};

export const useMinecraftStore = create<MinecraftStore>((set) => ({
  selectedServerId: null,
  setSelectedServerId: (value) => set({ selectedServerId: value }),
}));
