"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { ACHIEVEMENTS, type AchievementDef } from "@/lib/achievements/defs";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";

/**
 * Achievement Constellation — each achievement is a star node.
 * Locked = dim, unlocked = illuminated, newly = starburst.
 * The grid below is the accessible equivalent (not decorative-only).
 */
export function AchievementConstellation({ unlockedCodes, unlockedAt }: {
  unlockedCodes: Set<string>;
  unlockedAt: Map<string, string>;
}) {
  const [selected, setSelected] = useState<AchievementDef | null>(null);
  const fresh = new Set([...unlockedCodes].slice(-3)); // most recent unlocks glow

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* constellation field */}
      <div className="relative overflow-hidden rounded-card border border-cream-300/40 bg-[#0a0f1e] p-6">
        <div className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(168,85,247,0.12), transparent 40%), radial-gradient(circle at 80% 70%, rgba(34,211,238,0.1), transparent 40%)" }} />
        <div className="relative grid grid-cols-3 gap-4 sm:grid-cols-4">
          {ACHIEVEMENTS.map((a, i) => {
            const un = unlockedCodes.has(a.code);
            const isFresh = fresh.has(a.code);
            return (
              <motion.button
                key={a.code}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(a)}
                aria-label={`${a.title} — ${un ? "unlocked" : "locked"}`}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-2xl p-4 transition-colors",
                  un ? "hover:bg-lav-400/10" : "opacity-60 hover:opacity-90"
                )}
              >
                {isFresh && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }}
                    className="absolute inset-0 rounded-2xl border border-sun-300/60"
                  />
                )}
                <span className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border transition-all",
                  un
                    ? "border-lav-300/60 bg-lav-400/15 text-lav-300 shadow-[0_0_16px_-4px_rgba(168,85,247,0.6)]"
                    : "border-cream-300/40 bg-cream-100/40 text-ink-400"
                )}>
                  {un ? <Sparkles className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </span>
                <span className={cn("text-center text-[11px] font-extrabold leading-tight", un ? "text-ink-700" : "text-ink-400")}>
                  {a.title}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* accessible detail panel */}
      <Card className="flex flex-col gap-3 self-start p-5">
        {selected ? (
          <>
            <h3 className="text-base font-extrabold text-ink-800">{selected.title}</h3>
            <p className="text-sm font-semibold text-ink-500">{selected.description}</p>
            <Chip className={unlockedCodes.has(selected.code) ? "bg-mint-100 text-mint-600 border-mint-300/50" : "bg-cream-100 text-ink-400 border-cream-300/50"}>
              {unlockedCodes.has(selected.code) ? "Unlocked" : "Locked"}
            </Chip>
            {unlockedAt.get(selected.code) && (
              <p className="text-xs font-bold text-ink-400">
                Earned {new Date(unlockedAt.get(selected.code)!).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </p>
            )}
            {selected.xpBonus > 0 && <p className="text-xs font-bold text-sun-500">+{selected.xpBonus} bonus XP</p>}
          </>
        ) : (
          <p className="text-sm font-semibold text-ink-400">Select a star to inspect an achievement.</p>
        )}
        <p className="mt-auto border-t border-cream-300/50 pt-3 text-[11px] font-semibold text-ink-400">
          {unlockedCodes.size}/{ACHIEVEMENTS.length} unlocked — every badge is earned through real activity.
        </p>
      </Card>
    </div>
  );
}
