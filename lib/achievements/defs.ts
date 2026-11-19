/**
 * Achievement definitions + rank titles. Pure logic — unit-testable.
 * Unlock records persist in student_achievements (existing table).
 * Evaluation is server-side in lib/achievements/evaluate.ts.
 */

export type AchievementCategory =
  | "getting_started" | "coding" | "mastery" | "consistency" | "exam";

export interface AchievementDef {
  code: string;
  title: string;
  description: string;
  icon: string; // lucide icon name hint
  category: AchievementCategory;
  xpBonus: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_lesson", title: "First Steps", description: "Completed your first Java lesson.", icon: "BookOpen", category: "getting_started", xpBonus: 0 },
  { code: "first_mission", title: "First Mission", description: "Cleared your first coding mission.", icon: "Target", category: "getting_started", xpBonus: 0 },
  { code: "first_run", title: "Hello, Compiler", description: "Ran your first Java program.", icon: "Play", category: "getting_started", xpBonus: 0 },
  { code: "five_missions", title: "Mission Regular", description: "Cleared 5 coding missions.", icon: "Trophy", category: "coding", xpBonus: 25 },
  { code: "all_missions", title: "Mission Complete", description: "Cleared every coding mission.", icon: "Crown", category: "coding", xpBonus: 100 },
  { code: "xp_500", title: "Rising Star", description: "Earned 500 XP.", icon: "Zap", category: "mastery", xpBonus: 0 },
  { code: "xp_1500", title: "Code Architect", description: "Earned 1500 XP.", icon: "Cpu", category: "mastery", xpBonus: 0 },
  { code: "active_3", title: "On a Roll", description: "Studied on 3 different days.", icon: "Flame", category: "consistency", xpBonus: 0 },
  { code: "active_10", title: "Dedicated Scholar", description: "Studied on 10 different days.", icon: "CalendarCheck", category: "consistency", xpBonus: 50 },
  { code: "first_exam", title: "Exam Ready", description: "Completed your first exam.", icon: "ClipboardList", category: "exam", xpBonus: 0 },
  { code: "exam_80", title: "Exam Ace", description: "Scored 80%+ on an exam.", icon: "Award", category: "exam", xpBonus: 25 },
];

/** Stats snapshot gathered server-side — the ONLY input to evaluation. */
export interface AchievementStats {
  xp: number;
  lessonsCompleted: number;
  missionsCompleted: number;
  totalMissions: number;
  codingRuns: number;
  activeDays: number;
  examsCompleted: number;
  bestExamPercent: number | null;
}

/** Returns codes of achievements the stats qualify for. */
export function evaluateAchievements(s: AchievementStats): string[] {
  const out: string[] = [];
  const has = (c: string, ok: boolean) => { if (ok) out.push(c); };
  has("first_lesson", s.lessonsCompleted >= 1);
  has("first_mission", s.missionsCompleted >= 1);
  has("first_run", s.codingRuns >= 1);
  has("five_missions", s.missionsCompleted >= 5);
  has("all_missions", s.totalMissions > 0 && s.missionsCompleted >= s.totalMissions);
  has("xp_500", s.xp >= 500);
  has("xp_1500", s.xp >= 1500);
  has("active_3", s.activeDays >= 3);
  has("active_10", s.activeDays >= 10);
  has("first_exam", s.examsCompleted >= 1);
  has("exam_80", (s.bestExamPercent ?? 0) >= 80);
  return out;
}

// ---------------------------------------------------------------- ranks

export interface Rank {
  title: string;
  minLevel: number; // level thresholds reuse the 150-XP level system
}

export const RANKS: Rank[] = [
  { title: "Code Rookie", minLevel: 1 },
  { title: "Byte Explorer", minLevel: 3 },
  { title: "Logic Warrior", minLevel: 5 },
  { title: "Java Architect", minLevel: 8 },
  { title: "Code Master", minLevel: 12 },
];

export function rankForLevel(level: number): { current: Rank; next: Rank | null; progress: number } {
  let cur = RANKS[0];
  let next: Rank | null = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (level >= RANKS[i].minLevel) {
      cur = RANKS[i];
      next = RANKS[i + 1] ?? null;
    }
  }
  const progress = next
    ? Math.min(1, Math.max(0, (level - cur.minLevel) / (next.minLevel - cur.minLevel)))
    : 1;
  return { current: cur, next, progress };
}
