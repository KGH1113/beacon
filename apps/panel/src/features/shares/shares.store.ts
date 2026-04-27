"use client";

import { create } from "@/zustand";

import type { ShareFilter } from "./shares.lib";

export type ShareUploadProgressItem = {
  fileName: string;
  id: string;
  progress: number;
};

type SharesStore = {
  activeFilter: ShareFilter;
  selectedShareId: string | null;
  uploadProgressItems: ShareUploadProgressItem[];
  failUploadProgress: (id: string) => void;
  finishUploadProgress: (id: string) => void;
  setActiveFilter: (value: ShareFilter) => void;
  setSelectedShareId: (value: string | null) => void;
  setUploadProgress: (id: string, value: number) => void;
  startUploadProgress: (item: ShareUploadProgressItem) => void;
};

export const useSharesStore = create<SharesStore>((set) => ({
  activeFilter: "all",
  selectedShareId: null,
  uploadProgressItems: [],
  failUploadProgress: (id) => {
    set((state) => ({
      uploadProgressItems: state.uploadProgressItems.filter(
        (item) => item.id !== id,
      ),
    }));
  },
  finishUploadProgress: (id) => {
    set((state) => ({
      uploadProgressItems: state.uploadProgressItems.map((item) =>
        item.id === id ? { ...item, progress: 100 } : item,
      ),
    }));

    setTimeout(() => {
      set((state) => ({
        uploadProgressItems: state.uploadProgressItems.filter(
          (item) => item.id !== id,
        ),
      }));
    }, 700);
  },
  setActiveFilter: (value) => set({ activeFilter: value }),
  setSelectedShareId: (value) => set({ selectedShareId: value }),
  setUploadProgress: (id, value) =>
    set((state) => ({
      uploadProgressItems: state.uploadProgressItems.map((item) =>
        item.id === id
          ? { ...item, progress: Math.max(0, Math.min(100, value)) }
          : item,
      ),
    })),
  startUploadProgress: (item) =>
    set((state) => ({
      uploadProgressItems: [
        ...state.uploadProgressItems.filter(
          (uploadItem) => uploadItem.id !== item.id,
        ),
        {
          ...item,
          progress: Math.max(0, Math.min(100, item.progress)),
        },
      ],
    })),
}));
