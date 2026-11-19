"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** Streak flame — visual intensity scales with REAL consecutive-day streak. */
export function StreakFlame({ streak, best = 0 }: { streak: number; best?: number }) {
  if (streak <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-cream-300/50 bg-cream-100/60 px-3 py-1 text-xs font-bold text-ink-400">
        <Flame className="h-3.5 w-3.5 opacity-40" /> Start your streak today
      </span>
    );
  }
  const stage = streak >= 14 ? 4 : streak >= 7 ? 3 : streak >= 3 ? 2 : 1;
  const colors = ["", "text-sun-400", "text-orange-400", "text-red-400", "text-lav-400"];
  const glow = ["", "shadow-[0_0_8px_-2px_rgba(251,191,36,0.5)]", "shadow-[0_0_10px_-2px_rgba(251,146,60,0.6)]", "shadow-[0_0_14px_-2px_rgba(248,113,113,0.7)]", "shadow-[0_0_16px_-2px_rgba(168,85,247,0.8)]"];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border border-sun-300/40 bg-sun-50 px-3 py-1 text-xs font-extrabold", colors[stage], glow[stage])}
      title={`${streak}-day streak${best > streak ? ` · best ${best}` : ""}`}
    >
      <Flame className={cn("h-3.5 w-3.5", stage >= 3 && "animate-pulse")} />
      {streak}-day streak
    </span>
  );
}
