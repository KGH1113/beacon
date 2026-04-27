import type { ReactNode } from "react";

import { ShareUploadProgressBar } from "@/components/share-upload-progress-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh">
      {children}
      <ShareUploadProgressBar />
    </div>
  );
}
