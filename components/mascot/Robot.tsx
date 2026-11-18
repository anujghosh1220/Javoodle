"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { RobotMood } from "@/lib/mascot/types";

export type { RobotMood };

const mouthPaths: Record<RobotMood, string> = {
  idle: "M40 66 Q50 72 60 66",
  happy: "M36 62 Q50 76 64 62",
  excited: "M34 60 Q50 80 66 60",
  thinking: "M42 70 L58 70",
  confused: "M40 68 Q46 64 52 68 Q56 72 60 66",
  sad: "M40 70 Q50 62 60 70",
  sleepy: "M42 68 Q50 72 58 68",
  focused: "M40 68 L60 68",
  celebrating: "M32 58 Q50 84 68 58",
};

const bounceMoods = new Set<RobotMood>(["excited", "celebrating", "happy"]);

// ViewBox includes transparent padding so animated limbs never clip:
// arms reach ~x -24..117, jump lifts the antenna to y ~-10, feet+shadow bottom ~168.
const VB_X = -42;
const VB_Y = -20;
const VB_W = 184;
const VB_H = 210;
/** character height in viewBox units (used to keep `size` = character px height) */
const CHAR_H = 186;

/**
 * Full-body Javoodle robot. The head/face/mood visuals are unchanged from the
 * original mascot; the body adds torso, arms, hands, legs and feet.
 *
 * Animatable SVG groups carry `data-part` attributes; the companion's movement
 * controller queries them once and writes per-frame transforms directly to the
 * DOM (no React re-renders). When `animated` is false, all motion is delegated
 * to that controller.
 */
export function Robot({
  mood = "idle",
  size = 120,
  className,
  trackCursor = false,
  animated = true,
}: {
  mood?: RobotMood;
  /** rendered height in px */
  size?: number;
  className?: string;
  /** Enables pupil + head cursor tracking (standalone mode). */
  trackCursor?: boolean;
  /** When false, skips the internal bounce animation (controller-driven). */
  animated?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gaze = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const headEl = useRef<SVGGElement>(null);


  useEffect(() => {
    if (!trackCursor) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let running = false;

    const onMove = (e: PointerEvent) => {
      const el = svgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.42; // eye line
      const scale = VB_W / r.width;
      gaze.current.tx = Math.max(-3.2, Math.min(3.2, (e.clientX - cx) * scale * 0.35));
      gaze.current.ty = Math.max(-2.6, Math.min(2.6, (e.clientY - cy) * scale * 0.35));
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const onLeave = () => {
      gaze.current.tx = 0;
      gaze.current.ty = 0;
    };
    const tick = () => {
      const g = gaze.current;
      g.x += (g.tx - g.x) * 0.12;
      g.y += (g.ty - g.y) * 0.12;
      const pupils = svgRef.current?.querySelectorAll<SVGGElement>("[data-pupil]");
      pupils?.forEach((p) => p.setAttribute("transform", `translate(${g.x} ${g.y})`));
      if (headEl.current) {
        const tilt = g.x * 1.4;
        headEl.current.setAttribute("transform", `rotate(${tilt} 50 50)`);
      }
      if (Math.abs(g.tx - g.x) > 0.05 || Math.abs(g.ty - g.y) > 0.05 || g.tx !== 0 || g.ty !== 0) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
      cancelAnimationFrame(raf);
    };
  }, [trackCursor]);

  const eyesClosed = mood === "sleepy";
  const halfClosed = mood === "focused";
  const bouncing = animated && bounceMoods.has(mood);

  const content = (
    <>
      {/* ground shadow */}
      <ellipse cx="50" cy="162" rx="30" ry="5.5" fill="#000" opacity="0.28" />
      {/* whole character — controller writes translate/rotate/scale here */}
      <g data-part="root">
        {/* torso + limbs group — drops when sitting */}
        <g data-part="body">
          {/* legs (behind torso) */}
          <g transform="translate(40 124)">
            <g data-part="legL">
              <rect x="-7" y="1" width="14" height="26" rx="7" fill="#7c3aed" />
              <rect x="-12" y="21" width="24" height="11" rx="5.5" fill="#34d399" />
            </g>
          </g>
          <g transform="translate(60 124)">
            <g data-part="legR">
              <rect x="-7" y="1" width="14" height="26" rx="7" fill="#7c3aed" />
              <rect x="-12" y="21" width="24" height="11" rx="5.5" fill="#34d399" />
            </g>
          </g>
          {/* torso */}
          <rect x="24" y="76" width="52" height="56" rx="16" fill="#34d399" />
          <rect x="34" y="85" width="32" height="28" rx="9" fill="#0b3b36" opacity="0.9" />
          <circle cx="43" cy="99" r="2.2" fill="#6ee7b7" />
          <circle cx="50" cy="99" r="2.2" fill="#6ee7b7" />
          <circle cx="57" cy="99" r="2.2" fill="#6ee7b7" />
          {/* arms */}
          <g transform="translate(21 90)">
            <g data-part="armL">
              <rect x="-6.5" y="1" width="13" height="27" rx="6.5" fill="#a78bfa" />
              <circle cx="0" cy="31" r="7" fill="#6ee7b7" />
            </g>
          </g>
          <g transform="translate(79 90)">
            <g data-part="armR">
              <rect x="-6.5" y="1" width="13" height="27" rx="6.5" fill="#a78bfa" />
              <circle cx="0" cy="31" r="7" fill="#6ee7b7" />
            </g>
          </g>
          {/* head + face (tilts with cursor / look target) */}
          <g ref={headEl} data-part="head">
            {/* antenna */}
            <line x1="50" y1="14" x2="50" y2="26" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" />
            <circle cx="50" cy="11" r="5" fill="#ffd34d">
              <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* ears */}
            <rect x="12" y="42" width="8" height="16" rx="4" fill="#6ee7b7" />
            <rect x="80" y="42" width="8" height="16" rx="4" fill="#6ee7b7" />
            {/* head + eyes */}
            <rect x="20" y="24" width="60" height="52" rx="18" fill="#a78bfa" />
            <rect x="26" y="30" width="48" height="40" rx="13" fill="#ede9fe" />
            {mood === "thinking" ? (
              <>
                <circle cx="40" cy="46" r="4" fill="#35324a" />
                <circle cx="60" cy="46" r="4" fill="#35324a" />
                <path d="M56 38 q4 -3 8 0" stroke="#35324a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            ) : mood === "confused" ? (
              <>
                <circle cx="40" cy="50" r="5" fill="#1a1728" />
                <circle cx="42" cy="48" r="1.6" fill="#fff" />
                <circle cx="60" cy="46" r="5" fill="#1a1728" />
                <circle cx="62" cy="44" r="1.6" fill="#fff" />
              </>
            ) : eyesClosed ? (
              <>
                <path d="M34 50 Q40 55 46 50" stroke="#1a1728" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M54 50 Q60 55 66 50" stroke="#1a1728" strokeWidth="3" fill="none" strokeLinecap="round" />
              </>
            ) : halfClosed ? (
              <>
                <g data-pupil><circle cx="40" cy="48" r="5" fill="#1a1728" /><rect x="34" y="42" width="12" height="5" rx="2.5" fill="#ede9fe" /></g>
                <g data-pupil><circle cx="60" cy="48" r="5" fill="#1a1728" /><rect x="54" y="42" width="12" height="5" rx="2.5" fill="#ede9fe" /></g>
              </>
            ) : (
              <>
                <g data-pupil><circle cx="40" cy="48" r="5.5" fill="#1a1728" /><circle cx="42" cy="46" r="1.8" fill="#fff" /></g>
                <g data-pupil><circle cx="60" cy="48" r="5.5" fill="#1a1728" /><circle cx="62" cy="46" r="1.8" fill="#fff" /></g>
              </>
            )}
            {/* blush */}
            <circle cx="32" cy="58" r="4" fill="#fda4af" opacity="0.7" />
            <circle cx="68" cy="58" r="4" fill="#fda4af" opacity="0.7" />
            {/* mouth */}
            <path d={mouthPaths[mood]} stroke="#1a1728" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
          {/* sleep bubbles */}
          <g data-part="zzz" opacity="0">
            <text x="76" y="34" fontSize="10" fontWeight="800" fill="#c084fc">z</text>
            <text x="84" y="24" fontSize="13" fontWeight="800" fill="#c084fc">Z</text>
            <text x="93" y="12" fontSize="16" fontWeight="800" fill="#c084fc">Z</text>
          </g>
        </g>
      </g>
    </>
  );

  const u = size / CHAR_H;
  const dims = {
    width: VB_W * u,
    height: VB_H * u,
    viewBox: `${VB_X} ${VB_Y} ${VB_W} ${VB_H}`,
    style: { overflow: "visible" as const },
    className: cn("shrink-0", className),
    role: "img" as const,
    "aria-label": "Javoodle robot mascot",
  };

  if (!animated) {
    return (
      <svg ref={svgRef} {...dims}>
        {content}
      </svg>
    );
  }

  return (
    <motion.svg
      ref={svgRef}
      {...dims}
      initial={false}
      animate={bouncing ? { y: [0, -7, 0] } : { y: 0 }}
      transition={
        bouncing
          ? { repeat: Infinity, duration: mood === "celebrating" ? 0.9 : 1.4, ease: "easeInOut" }
          : { duration: 0.4 }
      }
    >
      {content}
    </motion.svg>
  );
}
