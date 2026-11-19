"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { onExperience, type ExperienceEvent } from "@/lib/experience/events";
import { playSound, setSoundEnabled, setSoundMuted, unlockAudio, type SoundName } from "@/lib/atmosphere/sound-engine";

const EXAM_TAKE = /^\/exams\/[^/]+\/take/;

const EVENT_SOUND: Partial<Record<ExperienceEvent["type"], SoundName>> = {
  "xp.awarded": "xp",
  "level.up": "levelup",
  "mission.completed": "mission",
  "achievement.unlocked": "achievement",
  "code.execution.succeeded": "exec_ok",
  "code.execution.failed": "exec_fail",
  "lesson.completed": "lesson",
};

/**
 * Bridges verified experience events → synthesized sounds.
 * Mute during exam take routes and hidden tabs; sound pref from atmosphere.
 */
export function SoundBridge() {
  const pathname = usePathname() ?? "/";

  // Sound is always enabled — no user-facing toggle. Autoplay policy still
  // requires a real gesture before AudioContext can start (handled below).
  useEffect(() => setSoundEnabled(true), []);
  useEffect(() => setSoundMuted(EXAM_TAKE.test(pathname)), [pathname]);

  // Unlock audio on first user gesture (autoplay policy).
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const onVis = () => setSoundMuted(EXAM_TAKE.test(pathname) || document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname]);

  useEffect(() => onExperience((e) => {
    const s = EVENT_SOUND[e.type];
    if (s) playSound(s);
  }), []);

  return null;
}
