"use client";

import { create } from "@/zustand";

import type { ShareFilter } from "./shares.lib";

type SharesStore = {
  activeFilter: ShareFilter;
  isUploadProgressVisible: boolean;
  uploadProgress: number;
  uploadProgressResetTimer: ReturnType<typeof setTimeout> | null;
  selectedShareId: string | null;
  setActiveFilter: (value: ShareFilter) => void;
  setSelectedShareId: (value: string | null) => void;
  setUploadProgress: (value: number) => void;
  startUploadProgress: () => void;
  finishUploadProgress: () => void;
};

export const useSharesStore = create<SharesStore>((set) => ({
  activeFilter: "all",
  isUploadProgressVisible: false,
  selectedShareId: null,
  uploadProgress: 0,
  uploadProgressResetTimer: null,
  setActiveFilter: (value) => set({ activeFilter: value }),
  setSelectedShareId: (value) => set({ selectedShareId: value }),
  setUploadProgress: (value) =>
    set({
      isUploadProgressVisible: true,
      uploadProgress: Math.max(0, Math.min(100, value)),
    }),
  startUploadProgress: () =>
    set((state) => {
      if (state.uploadProgressResetTimer) {
        clearTimeout(state.uploadProgressResetTimer);
      }

      return {
        isUploadProgressVisible: true,
        uploadProgress: 0,
        uploadProgressResetTimer: null,
      };
    }),
  finishUploadProgress: () =>
    set((state) => {
      if (state.uploadProgressResetTimer) {
        clearTimeout(state.uploadProgressResetTimer);
      }

      const uploadProgressResetTimer = setTimeout(() => {
        set({
          isUploadProgressVisible: false,
          uploadProgress: 0,
          uploadProgressResetTimer: null,
        });
      }, 700);

      return {
        isUploadProgressVisible: true,
        uploadProgress: 100,
        uploadProgressResetTimer,
      };
    }),
}));
