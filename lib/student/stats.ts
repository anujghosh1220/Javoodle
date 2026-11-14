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

export interface RecentActivity {
  lastExam: { title: string; href: string } | null;
  pendingEvals: number;
  latestResult: { title: string; score: number | null; max: number | null; href: string } | null;
  lastCoding: { title: string; href: string } | null;
  codingSubmissions: number;
}

/** Latest real activity for the "Continue your journey" dashboard section. */
export async function getRecentStudentActivity(studentId: string | null): Promise<RecentActivity> {
  const empty: RecentActivity = { lastExam: null, pendingEvals: 0, latestResult: null, lastCoding: null, codingSubmissions: 0 };
  if (!studentId || !isSupabaseConfigured() || !hasServiceRoleKey()) return empty;
  const admin = createAdminClient();

  const [attempts, submissions, codingSubs] = await Promise.all([
    admin.from("exam_attempts")
      .select("status, total_score, exams(title,total_marks)")
      .eq("student_id", studentId)
      .order("started_at", { ascending: false })
      .limit(10),
    admin.from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "submitted"),
    admin.from("coding_submissions")
      .select("id, coding_questions(title)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const rows = (attempts.data ?? []) as Array<{ status: string; total_score: number | null; max_marks: number | null; exams: { title: string; total_marks: number | null } | Array<{ title: string; total_marks: number | null }> | null }>;
  const examRow = (e: typeof rows[number]["exams"]) => (Array.isArray(e) ? e[0] : e);
  const examTitle = (e: typeof rows[number]["exams"]) => examRow(e)?.title ?? "Exam";
  const examMax = (e: typeof rows[number]["exams"]) => examRow(e)?.total_marks ?? null;
  const first = rows[0];
  const resultRow = rows.find((r) => r.status === "evaluated" || (r.total_score !== null));

  const codingRows = (codingSubs.data ?? []) as Array<{ id: string; coding_questions: { title: string } | { title: string }[] | null }>;
  const lastCodingRow = codingRows[0];

  return {
    lastExam: first ? { title: examTitle(first.exams), href: `/exams` } : null,
    pendingEvals: submissions.count ?? 0,
    latestResult: resultRow
      ? { title: examTitle(resultRow.exams), score: resultRow.total_score, max: examMax(resultRow.exams), href: "/exams" }
      : null,
    lastCoding: lastCodingRow
      ? { title: (Array.isArray(lastCodingRow.coding_questions) ? lastCodingRow.coding_questions[0]?.title : lastCodingRow.coding_questions?.title) ?? "Coding question", href: "/coding" }
      : null,
    codingSubmissions: codingRows.length,
  };
}
