import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

export type DetailPageHeaderStatus = {
  label: string;
  className?: string;
};

export function DetailPageHeader({
  title,
  description,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
  status,
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  status?: DetailPageHeaderStatus;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button asChild size="icon-lg" variant="ghost">
        <Link aria-label={backLabel} href={backHref}>
          <CaretLeftIcon />
        </Link>
      </Button>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-2xl">{title}</h1>
            {status ? (
              <Badge
                className={cn(status.className)}
                variant={status.className ? "secondary" : "outline"}
              >
                {status.label}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}
