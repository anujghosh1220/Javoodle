import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "lav" | "mint" | "sun" | "ink";

const tones: Record<Tone, string> = {
  lav: "bg-lav-100 text-lav-600",
  mint: "bg-mint-100 text-mint-600",
  sun: "bg-sun-100 text-ink-600",
  ink: "bg-cream-100 text-ink-500",
};

export function Chip({
  tone = "lav",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
