"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X } from "lucide-react";
import type { AchievementDef } from "@/lib/achievements/defs";
import { emitRobotEvent } from "@/lib/mascot/events";
import { emitExperience } from "@/lib/experience/events";

/**
 * Achievement unlock queue — dark holographic overlay, skippable,
 * shows one badge at a time. Mount with the defs unlocked this session.
 */
export function UnlockToast({ defs }: { defs: AchievementDef[] }) {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const current = dismissed ? null : defs[index] ?? null;
  const remaining = defs.length - index - 1;

  useEffect(() => {
    if (dismissed || index >= defs.length) return;
    emitRobotEvent("celebrating");
    const def = defs[index];
    if (def) emitExperience({ type: "achievement.unlocked", code: def.code, title: def.title });
    const t = setTimeout(() => setIndex((i) => i + 1), 4200);
    return () => clearTimeout(t);
  }, [index, defs.length, dismissed]);

  const dismiss = () => setDismissed(true);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.code}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/60 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ scale: 0.8, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="pointer-events-auto relative flex w-[340px] flex-col items-center gap-3 rounded-card border border-lav-300/50 bg-cream-100 p-7 text-center shadow-[0_0_60px_-10px_rgba(168,85,247,0.5)]"
          >
            <button onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 text-ink-400 hover:text-ink-600">
              <X className="h-4 w-4" />
            </button>
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 15 }}
              className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-lav-400 to-mint-400 text-white shadow-[0_0_30px_-5px_rgba(168,85,247,0.7)]"
            >
              <Trophy className="h-8 w-8" />
            </motion.div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-lav-400">Achievement Unlocked</p>
              <h3 className="mt-1 text-xl font-extrabold text-ink-800">{current.title}</h3>
              <p className="mt-1 text-sm font-semibold text-ink-500">{current.description}</p>
              {current.xpBonus > 0 && (
                <p className="mt-2 inline-flex rounded-full bg-sun-100 px-3 py-1 text-xs font-extrabold text-sun-500">+{current.xpBonus} bonus XP</p>
              )}
            </div>
            {remaining > 0 && (
              <p className="text-[10px] font-bold text-ink-400">{remaining} more waiting…</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
