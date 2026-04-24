import { cn } from "@/utils";

export function SummaryMetric({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-xl">{value}</span>
    </div>
  );
}
