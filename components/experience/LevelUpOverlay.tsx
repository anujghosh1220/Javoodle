"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { emitExperience } from "@/lib/experience/events";
import { rankForLevel } from "@/lib/achievements/defs";
import { emitRobotEvent } from "@/lib/mascot/events";

const KEY = "javoodle.lastLevel.v1";

/**
 * Grand Level-Up — fires ONLY when confirmed stats show a genuine level
 * increase vs the last-seen level (sessionStorage is a UI hint only;
 * XP authority stays in xp_events). Skippable, reduced-motion aware.
 */
export function LevelUpOverlay({ level }: { level: number }) {
  const [show, setShow] = useState<number | null>(null);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    let prev: number | null = null;
    try { prev = Number(localStorage.getItem(KEY)); } catch { /* storage unavailable */ }
    if (prev !== null && !Number.isNaN(prev) && level > prev) {
      shown.current = true;
      setShow(level);
      const rank = rankForLevel(level).current.title;
      emitExperience({ type: "level.up", level, rank });
      emitRobotEvent("celebrating");
    }
    try { localStorage.setItem(KEY, String(level)); } catch { /* ignore */ }
  }, [level]);

  const skip = () => setShow(null);

  return (
    <AnimatePresence>
      {show !== null && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/70 backdrop-blur-sm"
          role="dialog" aria-modal="true" aria-label={`Level ${show} reached`}
          onClick={skip}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="relative flex flex-col items-center gap-4 rounded-card border border-lav-300/60 bg-cream-100 px-12 py-10 text-center shadow-[0_0_80px_-10px_rgba(168,85,247,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 rounded-card border border-lav-300/30"
            />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-lav-400">Level Up</p>
            <motion.p
              initial={{ scale: 0.5 }} animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 14 }}
              className="bg-gradient-to-br from-cyan-300 via-lav-400 to-mint-400 bg-clip-text text-6xl font-extrabold text-transparent"
            >{show}</motion.p>
            <p className="text-sm font-extrabold uppercase tracking-widest text-ink-500">{rankForLevel(show).current.title}</p>
            <button onClick={skip} className="mt-2 rounded-full bg-lav-400 px-6 py-2 text-sm font-extrabold text-white transition-colors hover:bg-lav-500">
              Continue
            </button>
            <p className="text-[10px] font-bold text-ink-400">Press Esc or click anywhere to skip</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
