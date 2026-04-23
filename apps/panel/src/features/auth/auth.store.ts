"use client";

import { create } from "@/zustand";

type AuthStore = {
  passwordVisible: boolean;
  setPasswordVisible: (value: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  passwordVisible: false,
  setPasswordVisible: (value) => set({ passwordVisible: value }),
}));
