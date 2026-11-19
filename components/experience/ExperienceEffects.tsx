"use client";

import { useEffect, useState } from "react";
import { onExperience, type ExperienceEvent } from "@/lib/experience/events";

/**
 * Living Academy — a restrained DOM energy wave that ripples across the
 * viewport on verified experience events. Pure CSS transform/opacity,
 * pointer-events-none, respects reduced-motion via the media query.
 */
export function ExperienceEffects() {
  const [wave, setWave] = useState<{ id: number; kind: "xp" | "mission" | "achievement" } | null>(null);

  useEffect(() => onExperience((e: ExperienceEvent) => {
    if (e.type === "xp.awarded") setWave({ id: Date.now(), kind: "xp" });
    else if (e.type === "mission.completed") setWave({ id: Date.now(), kind: "mission" });
    else if (e.type === "achievement.unlocked") setWave({ id: Date.now(), kind: "achievement" });
  }), []);

  if (!wave) return null;
  const color = wave.kind === "achievement" ? "rgba(251,191,36,0.14)" : wave.kind === "mission" ? "rgba(34,211,238,0.12)" : "rgba(168,85,247,0.12)";

  return (
    <div key={wave.id} className="pointer-events-none fixed inset-0 z-[2] overflow-hidden" aria-hidden>
      <div
        className="xp-wave absolute inset-0"
        style={{ background: `radial-gradient(ellipse 60% 40% at 50% 110%, ${color}, transparent 70%)` }}
      />
      <style>{`
        @keyframes xpWaveRise { 0% { transform: translateY(30%) scaleY(0.4); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-110%) scaleY(1.1); opacity: 0; } }
        .xp-wave { animation: xpWaveRise 1.4s cubic-bezier(.2,.7,.3,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .xp-wave { animation: none; opacity: 0; } }
      `}</style>
    </div>
  );
}
