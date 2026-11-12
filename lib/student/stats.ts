import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DashboardStats {
  xp: number;
  questionsSolved: number;
  lessonsCompleted: number;
  syllabusPercent: number;
  examsTaken: number;
  averageExamScore: number | null;
  /** False when running without Supabase (dev fallback). */
  persistent: boolean;
}

export const EMPTY_STATS: DashboardStats = {
  xp: 0,
  questionsSolved: 0,
  lessonsCompleted: 0,
  syllabusPercent: 0,
  examsTaken: 0,
  averageExamScore: null,
  persistent: false,
};

/**
 * Real per-student aggregates. All reads use the service role AFTER the
 * caller has been authorized by a validated session token — student_id is
 * never taken from client input.
 */
export async function getDashboardStats(
  studentId: string | null
): Promise<DashboardStats> {
  if (!studentId || !isSupabaseConfigured() || !hasServiceRoleKey()) {
    return EMPTY_STATS;
  }

  const admin = createAdminClient();

  const [xpRes, solvedRes, lessonsRes, publishedRes, examsRes] =
    await Promise.all([
      admin.from("xp_events").select("amount").eq("student_id", studentId),
      admin
        .from("practice_history")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId),
      admin
        .from("lesson_completions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId),
      admin
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("published", true),
      admin
        .from("exam_attempts")
        .select("total_score")
        .eq("student_id", studentId)
        .in("status", ["submitted", "evaluated"]),
    ]);

  const xp = (xpRes.data ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const questionsSolved = solvedRes.count ?? 0;
  const lessonsCompleted = lessonsRes.count ?? 0;
  const publishedLessons = publishedRes.count ?? 0;
  const syllabusPercent =
    publishedLessons > 0
      ? Math.round((lessonsCompleted / publishedLessons) * 100)
      : 0;

  const scores = (examsRes.data ?? [])
    .map((a) => a.total_score)
    .filter((s): s is number => s !== null);
  const averageExamScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  return {
    xp,
    questionsSolved,
    lessonsCompleted,
    syllabusPercent,
    examsTaken: scores.length,
    averageExamScore,
    persistent: true,
  };
}
