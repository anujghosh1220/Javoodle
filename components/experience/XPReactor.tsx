"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { onExperience } from "@/lib/experience/events";
import { cn } from "@/lib/utils";

/**
 * XP Reactor — signature progression visual. SVG rings + orbiting dots,
 * progress arc from the REAL 150-XP level system. Pulse triggers only on
 * confirmed xp.awarded events (never on mount/refresh).
 */
export function XPReactor({ xp, level, xpInto, xpForNext, compact = false }: {
  xp: number; level: number; xpInto: number; xpForNext: number; compact?: boolean;
}) {
  const [pulse, setPulse] = useState(0);
  const [displayXp, setDisplayXp] = useState(xp);
  const prevXp = useRef(xp);
  const size = compact ? 96 : 128;
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, xpInto / Math.max(1, xpForNext));

  useEffect(() => onExperience((e) => {
    if (e.type === "xp.awarded") {
      setPulse((p) => p + 1);
      // animate count toward new total
      const from = prevXp.current, to = xp + e.amount;
      const start = performance.now(), dur = 600;
      const stepFn = (t: number) => {
        const k = Math.min(1, (t - start) / dur);
        setDisplayXp(Math.round(from + (to - from) * k));
        if (k < 1) requestAnimationFrame(stepFn);
      };
      requestAnimationFrame(stepFn);
      prevXp.current = to;
    }
  }), [xp]);

  // keep display in sync on navigation/refresh (no replay)
  useEffect(() => {
    const id = requestAnimationFrame(() => { setDisplayXp(xp); prevXp.current = xp; });
    return () => cancelAnimationFrame(id);
  }, [xp]);

  return (
    <div className={cn("relative flex items-center justify-center", compact ? "h-24 w-24" : "h-32 w-32")} role="img"
      aria-label={`Level ${level}, ${xp} XP, ${xpInto} of ${xpForNext} XP to next level`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1B2A47" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r - 8} fill="none" stroke="#293957" strokeWidth="1.5" strokeDasharray="3 6" />
        <motion.circle
          key={pulse}
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#xpgrad)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ * (1 - pct) }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="xpgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22D3EE" /><stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        {/* orbiting particles */}
        {[0, 1, 2].map((i) => (
          <circle key={i} r="2.5" fill={i === 1 ? "#22D3EE" : "#A855F7"} opacity="0.8">
            <animateMotion dur={`${4 + i * 1.7}s`} repeatCount="indefinite"
              path={`M ${size/2 + (r - 8) * Math.cos(i * 2.1)} ${size/2 + (r - 8) * Math.sin(i * 2.1)} m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0`} />
          </circle>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={pulse}
          initial={pulse ? { scale: 1.15 } : false}
          animate={{ scale: 1 }}
          className="text-xl font-extrabold text-ink-800"
        >{displayXp}</motion.span>
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-ink-400">XP · Lv {level}</span>
      </div>
    </div>
  );
}
