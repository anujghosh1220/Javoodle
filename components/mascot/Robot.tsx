"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type RobotMood = "idle" | "happy" | "excited" | "thinking";

const mouthPaths: Record<RobotMood, string> = {
  idle: "M40 66 Q50 72 60 66",
  happy: "M36 62 Q50 76 64 62",
  excited: "M34 60 Q50 80 66 60",
  thinking: "M42 70 L58 70",
};

export function Robot({
  mood = "idle",
  size = 120,
  className,
}: {
  mood?: RobotMood;
  size?: number;
  className?: string;
}) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      initial={false}
      animate={mood === "excited" ? { y: [0, -6, 0] } : { y: 0 }}
      transition={
        mood === "excited"
          ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" }
          : { duration: 0.4 }
      }
      role="img"
      aria-label="Javoodle robot mascot"
    >
      {/* antenna */}
      <line x1="50" y1="14" x2="50" y2="26" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="11" r="5" fill="#ffd34d">
        <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* ears */}
      <rect x="12" y="42" width="8" height="16" rx="4" fill="#6ee7b7" />
      <rect x="80" y="42" width="8" height="16" rx="4" fill="#6ee7b7" />
      {/* head */}
      <rect x="20" y="24" width="60" height="52" rx="18" fill="#a78bfa" />
      <rect x="26" y="30" width="48" height="40" rx="13" fill="#ede9fe" />
      {/* eyes */}
      {mood === "thinking" ? (
        <>
          <circle cx="40" cy="48" r="4" fill="#35324a" />
          <circle cx="60" cy="48" r="4" fill="#35324a" />
          <path d="M56 40 q4 -3 8 0" stroke="#35324a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="40" cy="48" r="5.5" fill="#1a1728" />
          <circle cx="42" cy="46" r="1.8" fill="#fff" />
          <circle cx="60" cy="48" r="5.5" fill="#1a1728" />
          <circle cx="62" cy="46" r="1.8" fill="#fff" />
        </>
      )}
      {/* blush */}
      <circle cx="32" cy="58" r="4" fill="#fda4af" opacity="0.7" />
      <circle cx="68" cy="58" r="4" fill="#fda4af" opacity="0.7" />
      {/* mouth */}
      <path
        d={mouthPaths[mood]}
        stroke="#1a1728"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* body */}
      <rect x="30" y="80" width="40" height="14" rx="7" fill="#34d399" />
      <circle cx="42" cy="87" r="2.5" fill="#fff" />
      <circle cx="50" cy="87" r="2.5" fill="#fff" />
      <circle cx="58" cy="87" r="2.5" fill="#fff" />
    </motion.svg>
  );
}
