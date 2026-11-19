"use client";

/**
 * Typed experience-event system — the single source of truth for
 * cross-component reactions (XP reactor pulses, energy waves, Robo moods).
 * Events are emitted ONLY from verified workflow results (server action
 * responses), never guessed client-side.
 */

export type ExperienceEvent =
  | { type: "xp.awarded"; amount: number; source: string }
  | { type: "level.up"; level: number; rank: string }
  | { type: "mission.started"; missionId: string }
  | { type: "mission.completed"; missionId: string; xp: number }
  | { type: "achievement.unlocked"; code: string; title: string }
  | { type: "code.execution.started" }
  | { type: "code.execution.succeeded" }
  | { type: "code.execution.failed" }
  | { type: "lesson.completed" }
  | { type: "student.returned" };

type Handler = (e: ExperienceEvent) => void;
const listeners = new Set<Handler>();

export function emitExperience(e: ExperienceEvent) {
  listeners.forEach((h) => h(e));
}

export function onExperience(h: Handler): () => void {
  listeners.add(h);
  return () => listeners.delete(h);
}
