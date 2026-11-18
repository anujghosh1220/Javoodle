"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Single rAF — CSS already collapses the transition under reduced-motion.
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

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
          "h-full rounded-full bg-gradient-to-r from-lav-300 via-mint-300 to-sun-300",
          "transition-[width] duration-700 ease-out",
          barClassName
        )}
        style={{ width: mounted ? `${pct}%` : "0%" }}
      />
    </div>
  );
}
