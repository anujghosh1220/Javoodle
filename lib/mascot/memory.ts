import { getDashboardStats, getRecentStudentActivity } from "@/lib/student/stats";

export interface CompanionMemory {
  name: string;
  level: string;
  levelIndex: number;
  examsTaken: number;
  codingSubs: number;
  questionsSolved: number;
  xp: number;
  lastExam: string | null;
  lastCoding: string | null;
  hasActivity: boolean;
}

const LEVELS = ["New Friend", "Learning Buddy", "Trusted Companion", "Study Partner", "Javoodle Legend"];

function levelFor(xp: number, exams: number, coding: number): number {
  const score = xp + exams * 50 + coding * 20;
  if (score >= 500) return 4;
  if (score >= 200) return 3;
  if (score >= 60) return 2;
  if (score >= 10) return 1;
  return 0;
}

/** Verified companion memory derived from real student data — no fake progress. */
export async function getCompanionMemory(studentId: string | null, name: string): Promise<CompanionMemory> {
  const [stats, activity] = await Promise.all([
    getDashboardStats(studentId),
    getRecentStudentActivity(studentId),
  ]);
  const li = levelFor(stats.xp, stats.examsTaken, activity.codingSubmissions);
  return {
    name,
    level: LEVELS[li],
    levelIndex: li,
    examsTaken: stats.examsTaken,
    codingSubs: activity.codingSubmissions,
    questionsSolved: stats.questionsSolved,
    xp: stats.xp,
    lastExam: activity.lastExam?.title ?? null,
    lastCoding: activity.lastCoding?.title ?? null,
    hasActivity: stats.persistent && (stats.examsTaken > 0 || activity.codingSubmissions > 0 || stats.questionsSolved > 0),
  };
}
