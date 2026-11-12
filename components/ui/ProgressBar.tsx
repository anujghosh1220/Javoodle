import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={cn("h-3 w-full rounded-full bg-cream-200 overflow-hidden", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-lav-300 via-mint-300 to-sun-300 transition-all duration-700",
          barClassName
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
