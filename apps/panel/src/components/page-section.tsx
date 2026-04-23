import type { ReactNode } from "react";

import { DetailPageHeader } from "@/components/detail-page-header";

export function PageSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <DetailPageHeader description={description} title={title} />
      {children}
    </section>
  );
}
