"use client";

import { useSharesStore } from "@/features/shares/shares.store";

export function ShareUploadProgressBar() {
  const isVisible = useSharesStore((state) => state.isUploadProgressVisible);
  const progress = useSharesStore((state) => state.uploadProgress);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed right-0 bottom-0 left-0 z-50 h-0.5 overflow-hidden"
    >
      <div
        className="h-full bg-primary transition-[width] duration-150 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
