import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { AnimatedNumber } from "./AnimatedNumber";
import { cn } from "@/lib/utils";

/**
 * Statistic card with icon, animated count-up value and label.
 * `value` may be a number (animated) or a ReactNode for pre-formatted values.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "bg-lav-100 text-lav-500",
  hint,
  className,
}: {
  label: string;
  value: number | React.ReactNode;
  icon: LucideIcon;
  tone?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={cn("flex items-center gap-3 p-4", className)}>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
          tone
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-extrabold leading-none text-ink-800">
          {typeof value === "number" ? (
            <AnimatedNumber value={value} />
          ) : (
            value
          )}
        </span>
        <span className="mt-1 block truncate text-xs font-bold text-ink-400">
          {label}
          {hint ? ` · ${hint}` : ""}
        </span>
      </span>
    </Card>
  );
}
