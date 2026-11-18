import "server-only";

import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

function db(): boolean {
  return isSupabaseConfigured() && hasServiceRoleKey();
}

export interface StudentDirectoryRow {
  id: string;
  name: string;
  registeredAt: string;
  /** Latest observed activity timestamp across sessions, lessons, practice, exams. */
  lastActivityAt: string | null;
  lessonsCompleted: number;
  examsAttempted: number;
  practiceAnswers: number;
}

export interface StudentDirectoryResult {
  rows: StudentDirectoryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** True when Supabase is not configured — page renders the empty state. */
  available: boolean;
}

export type StudentSort = "newest" | "activity" | "name";

const PAGE_SIZE = 25;

interface ActivityAgg {
  lessons: number;
  exams: number;
  practice: number;
  last: number; // epoch ms of most recent activity, 0 = none
}

function emptyAgg(): ActivityAgg {
  return { lessons: 0, exams: 0, practice: 0, last: 0 };
}

function bump(agg: ActivityAgg, ts: string | null | undefined) {
  if (!ts) return;
  const t = new Date(ts).getTime();
  if (Number.isFinite(t) && t > agg.last) agg.last = t;
}

/**
 * Registered students = rows in `public.students`.
 * Platform admins are Supabase Auth users (app_metadata.role='admin') and live
 * in a completely separate table — they can never appear here.
 * Students have no email: registration is display-name + cookie session only.
 */
export async function listStudentsDirectory(opts: {
  search?: string;
  sort?: StudentSort;
  page?: number;
}): Promise<StudentDirectoryResult> {
  const page = Math.max(1, opts.page ?? 1);
  const sort: StudentSort = opts.sort ?? "newest";
  const search = (opts.search ?? "").trim();

  if (!db()) {
    return { rows: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0, available: false };
  }

  const admin = createAdminClient();

  let studentQuery = admin
    .from("students")
    .select("id,display_name,created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    // Escape PostgREST wildcard chars; ilike is case-insensitive.
    const safe = search.replace(/[%_\\]/g, (c) => `\\${c}`);
    studentQuery = studentQuery.ilike("display_name", `%${safe}%`);
  }

  const { data: students, count, error } = await studentQuery;
  if (error) throw new Error(`students query failed: ${error.message}`);

  const all = students ?? [];
  const total = count ?? all.length;

  // Lightweight activity rows aggregated in JS. Fine at class scale;
  // revisit with an RPC/GROUP BY if the roster grows large.
  const ids = all.map((s: any) => s.id);
  const agg = new Map<string, ActivityAgg>();
  const get = (id: string) => {
    let a = agg.get(id);
    if (!a) { a = emptyAgg(); agg.set(id, a); }
    return a;
  };

  if (ids.length > 0) {
    const [sessions, completions, attempts, practice, xp] = await Promise.all([
      admin.from("student_sessions").select("student_id,last_seen_at").in("student_id", ids),
      admin.from("lesson_completions").select("student_id,completed_at").in("student_id", ids),
      admin.from("exam_attempts").select("student_id,started_at").in("student_id", ids),
      admin.from("practice_history").select("student_id,created_at").in("student_id", ids),
      admin.from("xp_events").select("student_id,created_at").in("student_id", ids),
    ]);

    for (const s of sessions.data ?? []) bump(get(s.student_id), s.last_seen_at);
    for (const c of completions.data ?? []) {
      const a = get(c.student_id);
      a.lessons += 1;
      bump(a, c.completed_at);
    }
    for (const e of attempts.data ?? []) {
      const a = get(e.student_id);
      a.exams += 1;
      bump(a, e.started_at);
    }
    for (const p of practice.data ?? []) {
      const a = get(p.student_id);
      a.practice += 1;
      bump(a, p.created_at);
    }
    for (const x of xp.data ?? []) bump(get(x.student_id), x.created_at);
  }

  const rows: StudentDirectoryRow[] = all.map((s: any) => {
    const a = agg.get(s.id) ?? emptyAgg();
    return {
      id: s.id,
      name: s.display_name,
      registeredAt: s.created_at,
      lastActivityAt: a.last ? new Date(a.last).toISOString() : null,
      lessonsCompleted: a.lessons,
      examsAttempted: a.exams,
      practiceAnswers: a.practice,
    };
  });

  if (sort === "activity") {
    rows.sort((x, y) => (y.lastActivityAt ?? "").localeCompare(x.lastActivityAt ?? ""));
  } else if (sort === "name") {
    rows.sort((x, y) => x.name.localeCompare(y.name));
  }
  // "newest" keeps the DB order (created_at desc).

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return { rows: paged, total, page: safePage, pageSize: PAGE_SIZE, totalPages, available: true };
}

export interface StudentDetail {
  id: string;
  name: string;
  registeredAt: string;
  lastActivityAt: string | null;
  lessonsCompleted: number;
  examsAttempted: number;
  publishedResults: number;
  practiceAnswers: number;
  xp: number;
  recentLessons: { title: string; completedAt: string }[];
  recentAttempts: { examTitle: string; status: string; score: number | null; total: number | null; startedAt: string }[];
  recentPractice: { correct: boolean | null; createdAt: string; questionText: string }[];
}

/** Concise per-student overview for the admin detail page. Read-only. */
export async function getStudentDetail(studentId: string): Promise<StudentDetail | null> {
  if (!db()) return null;
  const admin = createAdminClient();

  const { data: student, error } = await admin
    .from("students")
    .select("id,display_name,created_at")
    .eq("id", studentId)
    .maybeSingle();
  if (error || !student) return null;

  const [completions, attempts, practice, xp, sessions, lessonCount, attemptCount, practiceCount, resultCount] = await Promise.all([
    admin.from("lesson_completions").select("lesson_id,completed_at").eq("student_id", studentId).order("completed_at", { ascending: false }).limit(10),
    admin.from("exam_attempts").select("id,exam_id,status,total_score,started_at").eq("student_id", studentId).order("started_at", { ascending: false }).limit(10),
    admin.from("practice_history").select("id,question_id,correct,created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(10),
    admin.from("xp_events").select("amount,created_at").eq("student_id", studentId),
    admin.from("student_sessions").select("last_seen_at").eq("student_id", studentId).order("last_seen_at", { ascending: false }).limit(1),
    admin.from("lesson_completions").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    admin.from("exam_attempts").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    admin.from("practice_history").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    admin.from("exam_attempts").select("id", { count: "exact", head: true }).eq("student_id", studentId)
      .in("status", ["evaluation_completed", "result_published", "evaluated"]),
  ]);

  // Lesson titles for recent completions.
  const lessonIds = [...new Set((completions.data ?? []).map((c: any) => c.lesson_id))];
  const lessonTitle = new Map<string, string>();
  if (lessonIds.length) {
    const { data: lessons } = await admin.from("lessons").select("id,title").in("id", lessonIds);
    for (const l of lessons ?? []) lessonTitle.set(l.id, l.title);
  }

  // Exam titles + total marks for recent attempts.
  const examIds = [...new Set((attempts.data ?? []).map((a: any) => a.exam_id))];
  const examInfo = new Map<string, { title: string; total: number | null }>();
  if (examIds.length) {
    const { data: exams } = await admin.from("exams").select("id,title,total_marks").in("id", examIds);
    for (const e of exams ?? []) examInfo.set(e.id, { title: e.title, total: e.total_marks ?? null });
  }

  // Question text for recent practice.
  const qIds = [...new Set((practice.data ?? []).map((p: any) => p.question_id).filter(Boolean))];
  const qText = new Map<string, string>();
  if (qIds.length) {
    const { data: qs } = await admin.from("questions").select("id,text").in("id", qIds);
    for (const q of qs ?? []) qText.set(q.id, q.text);
  }

  const allCompletions = completions.data ?? [];
  const allAttempts = attempts.data ?? [];
  const allPractice = practice.data ?? [];

  const lastCandidates = [
    sessions.data?.[0]?.last_seen_at,
    allCompletions[0]?.completed_at,
    allAttempts[0]?.started_at,
    allPractice[0]?.created_at,
    ...(xp.data ?? []).map((x: any) => x.created_at),
  ].filter(Boolean) as string[];
  const lastActivityAt = lastCandidates.length
    ? lastCandidates.reduce((a, b) => (new Date(a).getTime() >= new Date(b).getTime() ? a : b))
    : null;

  return {
    id: student.id,
    name: student.display_name,
    registeredAt: student.created_at,
    lastActivityAt,
    lessonsCompleted: lessonCount.count ?? 0,
    examsAttempted: attemptCount.count ?? 0,
    publishedResults: resultCount.count ?? 0,
    practiceAnswers: practiceCount.count ?? 0,
    xp: (xp.data ?? []).reduce((s: number, x: any) => s + (x.amount ?? 0), 0),
    recentLessons: allCompletions.slice(0, 10).map((c: any) => ({
      title: lessonTitle.get(c.lesson_id) ?? "Lesson",
      completedAt: c.completed_at,
    })),
    recentAttempts: allAttempts.slice(0, 10).map((a: any) => {
      const info = examInfo.get(a.exam_id);
      return {
        examTitle: info?.title ?? "Exam",
        status: a.status,
        score: a.total_score ?? null,
        total: info?.total ?? null,
        startedAt: a.started_at,
      };
    }),
    recentPractice: allPractice.slice(0, 10).map((p: any) => ({
      correct: p.correct ?? null,
      createdAt: p.created_at,
      questionText: qText.get(p.question_id) ?? "Practice question",
    })),
  };
}
