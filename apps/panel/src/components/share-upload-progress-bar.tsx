"use client";

import { useSharesStore } from "@/features/shares/shares.store";

export function ShareUploadProgressBar() {
  const progressItems = useSharesStore((state) => state.uploadProgressItems);

  if (progressItems.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-0 bottom-0 left-0 z-50 flex flex-col-reverse gap-px"
    >
      {progressItems.map((item) => (
        <div className="h-0.5 overflow-hidden" key={item.id}>
          <div
            className="h-full bg-primary transition-[width] duration-150 ease-linear"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      ))}
    </div>
  );
}
