import "server-only";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPracticeTopics } from "@/lib/practice/data";

export interface GrowthData {
  persistent: boolean;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  practiceAttempted: number;
  practiceCorrect: number;
  practiceAccuracy: number | null;
  topicStats: Array<{ topicName: string; attempted: number; correct: number; accuracy: number | null }>;
  examsTaken: number;
  examsAvgPercent: number | null;
  examsBestPercent: number | null;
  recentResults: Array<{ title: string; score: number | null; max: number | null; status: string; date: string }>;
  codingSubmissions: number;
  codingReviewed: number;
  codingAvgMarks: number | null;
  codingPending: number;
  activityDays: Array<{ date: string; label: string; count: number }>;
  activeDays: number;
  milestones: Array<{ label: string; achieved: boolean }>;
}

const LEVEL_XP = 150; // XP required per level

export function levelForXp(xp: number): { level: number; into: number; next: number } {
  const level = Math.floor(xp / LEVEL_XP) + 1;
  const into = xp % LEVEL_XP;
  return { level, into, next: LEVEL_XP - into };
}

function empty(): GrowthData {
  return {
    persistent: false, xp: 0, level: 1, xpIntoLevel: 0, xpForNextLevel: LEVEL_XP,
    lessonsCompleted: 0, lessonsTotal: 0,
    practiceAttempted: 0, practiceCorrect: 0, practiceAccuracy: null,
    topicStats: [], examsTaken: 0, examsAvgPercent: null, examsBestPercent: null, recentResults: [],
    codingSubmissions: 0, codingReviewed: 0, codingAvgMarks: null, codingPending: 0,
    activityDays: [], activeDays: 0, milestones: [],
  };
}

export async function getGrowthData(studentId: string | null): Promise<GrowthData> {
  if (!studentId || !isSupabaseConfigured() || !hasServiceRoleKey()) return empty();
  const admin = createAdminClient();

  const since14 = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const [
    xpRes, practiceRes, lessonsDoneRes, lessonsTotalRes, attemptsRes,
    codingRes, topicStats, runsRes, completionsRes,
  ] = await Promise.all([
    admin.from("xp_events").select("amount,created_at").eq("student_id", studentId),
    admin.from("practice_history").select("correct,marks_awarded,created_at").eq("student_id", studentId),
    admin.from("lesson_completions").select("id,completed_at").eq("student_id", studentId),
    admin.from("lessons").select("id", { count: "exact", head: true }).eq("published", true),
    admin.from("exam_attempts")
      .select("status,total_score,started_at,submitted_at,exams(title,total_marks)")
      .eq("student_id", studentId)
      .in("status", ["submitted", "evaluated"])
      .order("started_at", { ascending: false })
      .limit(20),
    admin.from("coding_submissions")
      .select("review_status,marks_awarded,created_at,coding_questions(marks)")
      .eq("student_id", studentId),
    listPracticeTopics(studentId),
    admin.from("coding_execution_runs").select("created_at").eq("student_id", studentId).gte("created_at", since14),
    admin.from("lesson_completions").select("completed_at").eq("student_id", studentId).gte("completed_at", since14),
  ]);

  const xp = (xpRes.data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const { level, into, next } = levelForXp(xp);

  const practice = practiceRes.data ?? [];
  const attempted = practice.length;
  const correct = practice.filter((p) => p.correct === true).length;

  const lessonsDone = lessonsDoneRes.data ?? [];

  type AttemptRow = {
    status: string; total_score: number | null; started_at: string; submitted_at: string | null;
    exams: { title: string; total_marks: number | null } | Array<{ title: string; total_marks: number | null }> | null;
  };
  const attempts = (attemptsRes.data ?? []) as unknown as AttemptRow[];
  const examRow = (e: AttemptRow["exams"]) => (Array.isArray(e) ? e[0] : e);
  const percents = attempts
    .map((a) => {
      const max = examRow(a.exams)?.total_marks;
      return a.total_score !== null && max ? (a.total_score / max) * 100 : null;
    })
    .filter((p): p is number => p !== null);
  const examsAvgPercent = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null;
  const examsBestPercent = percents.length ? Math.round(Math.max(...percents)) : null;
  const recentResults = attempts.slice(0, 5).map((a) => ({
    title: examRow(a.exams)?.title ?? "Exam",
    score: a.total_score,
    max: examRow(a.exams)?.total_marks ?? null,
    status: a.status,
    date: a.submitted_at ?? a.started_at,
  }));

  type CodingRow = { review_status: string; marks_awarded: number | null; created_at: string; coding_questions: { marks: number } | Array<{ marks: number }> | null };
  const coding = (codingRes.data ?? []) as unknown as CodingRow[];
  const reviewedMarks = coding.filter((c) => c.review_status === "reviewed" && c.marks_awarded !== null);
  const codingAvgMarks = reviewedMarks.length
    ? Math.round((reviewedMarks.reduce((s, c) => s + (c.marks_awarded ?? 0), 0) / reviewedMarks.length) * 10) / 10
    : null;

  // Last-14-days activity strip across all real activity sources.
  const dayCounts = new Map<string, number>();
  const bump = (iso: string | null | undefined) => {
    if (!iso) return;
    const d = new Date(iso);
    const key = d.toISOString().slice(0, 10);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  };
  for (const e of xpRes.data ?? []) bump(e.created_at);
  for (const p of practice) bump(p.created_at);
  for (const l of lessonsDone) bump(l.completed_at);
  for (const c of coding) bump(c.created_at);
  for (const a of attempts) bump(a.submitted_at ?? a.started_at);
  for (const r of runsRes.data ?? []) bump(r.created_at);
  for (const c of completionsRes.data ?? []) bump(c.completed_at);

  const activityDays: Array<{ date: string; label: string; count: number }> = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    activityDays.push({
      date: key,
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      count: dayCounts.get(key) ?? 0,
    });
  }
  const activeDays = new Set([...dayCounts.keys()]).size;

  const milestones = [
    { label: "Finished your first lesson", achieved: lessonsDone.length >= 1 },
    { label: "Completed 5 lessons", achieved: lessonsDone.length >= 5 },
    { label: "Earned your first 100 XP", achieved: xp >= 100 },
    { label: "Answered 10 practice questions", achieved: attempted >= 10 },
    { label: "Scored 80%+ in practice", achieved: (practiceAccuracy(attempted, correct) ?? 0) >= 80 },
    { label: "Sat your first exam", achieved: attempts.length >= 1 },
    { label: "Submitted your first coding solution", achieved: coding.length >= 1 },
  ];

  return {
    persistent: true,
    xp, level, xpIntoLevel: into, xpForNextLevel: next,
    lessonsCompleted: lessonsDone.length,
    lessonsTotal: lessonsTotalRes.count ?? 0,
    practiceAttempted: attempted,
    practiceCorrect: correct,
    practiceAccuracy: practiceAccuracy(attempted, correct),
    topicStats: topicStats
      .filter((t) => t.attempted > 0)
      .map((t) => ({ topicName: t.topicName, attempted: t.attempted, correct: t.correct, accuracy: t.attempted ? Math.round((t.correct / t.attempted) * 100) : null })),
    examsTaken: attempts.length,
    examsAvgPercent,
    examsBestPercent,
    recentResults,
    codingSubmissions: coding.length,
    codingReviewed: reviewedMarks.length,
    codingAvgMarks,
    codingPending: coding.filter((c) => c.review_status === "pending").length,
    activityDays,
    activeDays,
    milestones,
  };
}

function practiceAccuracy(attempted: number, correct: number): number | null {
  return attempted > 0 ? Math.round((correct / attempted) * 100) : null;
}
