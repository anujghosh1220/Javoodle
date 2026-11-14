import "server-only";

import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTION_DOCUMENT_BUCKET } from "@/lib/storage/documents";
import type {
  AttemptStatus,
  ExamPaper,
  ExamSection,
  PaperQuestion,
} from "@/lib/exams/shared";

/* eslint-disable @typescript-eslint/no-explicit-any */

function db(): boolean {
  return isSupabaseConfigured() && hasServiceRoleKey();
}

export interface ExamListItem extends ExamPaper {
  attempts: number;
  pending_evaluations: number;
  published_results: number;
}

/** Admin exam dashboard rows with attempt/evaluation counts. */
export async function listExamsAdmin(): Promise<ExamListItem[]> {
  if (!db()) return [];
  const admin = createAdminClient();
  const { data: exams } = await admin
    .from("exams")
    .select(
      "id,title,subject,class_name,description,instructions,duration_minutes,reading_time_minutes,total_marks,passing_marks,opens_at,closes_at,status,release_model_answers,paper_document_id,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  const { data: attempts } = await admin
    .from("exam_attempts")
    .select("id,exam_id,status");

  const byExam = new Map<string, { attempts: number; pending: number; published: number }>();
  for (const a of attempts ?? []) {
    const row = byExam.get(a.exam_id) ?? { attempts: 0, pending: 0, published: 0 };
    row.attempts += 1;
    if (a.status === "submitted" || a.status === "under_evaluation") row.pending += 1;
    if (a.status === "result_published") row.published += 1;
    byExam.set(a.exam_id, row);
  }

  return (exams ?? []).map((e: any) => {
    const c = byExam.get(e.id) ?? { attempts: 0, pending: 0, published: 0 };
    return {
      ...(e as ExamPaper),
      attempts: c.attempts,
      pending_evaluations: c.pending,
      published_results: c.published,
    };
  });
}

export interface ExamAdminDetail {
  exam: ExamPaper & { created_at: string };
  sections: ExamSection[];
  questions: PaperQuestion[];
  optionalGroups: Array<{
    id: string;
    title: string;
    pick_count: number;
    max_counted_marks: number;
    order_index: number;
  }>;
  paperFileName: string | null;
  attemptCount: number;
}

export async function getExamAdmin(examId: string): Promise<ExamAdminDetail | null> {
  if (!db()) return null;
  const admin = createAdminClient();
  const { data: exam } = await admin.from("exams").select("*").eq("id", examId).maybeSingle();
  if (!exam) return null;

  const [sectionsRes, questionsRes, groupsRes, docRes, attemptsRes] = await Promise.all([
    admin.from("exam_sections").select("*").eq("exam_id", examId).order("order_index"),
    admin
      .from("exam_paper_questions")
      .select("*")
      .eq("exam_id", examId)
      .order("order_index"),
    admin
      .from("exam_optional_groups")
      .select("id,title,pick_count,max_counted_marks,order_index")
      .eq("exam_id", examId)
      .order("order_index"),
    (exam as any).paper_document_id
      ? admin
          .from("documents")
          .select("original_filename,filename")
          .eq("id", (exam as any).paper_document_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", examId),
  ]);

  const doc = docRes.data as any;
  return {
    exam: exam as any,
    sections: (sectionsRes.data ?? []) as ExamSection[],
    questions: (questionsRes.data ?? []).map((q: any) => ({
      ...q,
      marks: Number(q.marks),
      options: Array.isArray(q.options) ? q.options : [],
    })) as PaperQuestion[],
    optionalGroups: (groupsRes.data ?? []).map((g: any) => ({
      id: g.id,
      title: g.title,
      pick_count: Number(g.pick_count),
      max_counted_marks: Number(g.max_counted_marks),
      order_index: g.order_index,
    })),
    paperFileName: doc ? doc.original_filename || doc.filename : null,
    attemptCount: attemptsRes.count ?? 0,
  };
}

export interface SubmissionListItem {
  attempt_id: string;
  student_name: string;
  exam_id: string;
  exam_title: string;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  total_score: number | null;
  total_marks: number | null;
  percentage: number | null;
}

export async function listSubmissions(filters?: {
  examId?: string;
  status?: string;
}): Promise<SubmissionListItem[]> {
  if (!db()) return [];
  const admin = createAdminClient();
  let q = admin
    .from("exam_attempts")
    .select(
      "id,exam_id,status,started_at,submitted_at,total_score,total_marks_snapshot,percentage,students(display_name),exams(title)"
    )
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("started_at", { ascending: false });
  if (filters?.examId) q = q.eq("exam_id", filters.examId);
  if (filters?.status) q = q.eq("status", filters.status);

  const { data } = await q;
  return (data ?? []).map((a: any) => ({
    attempt_id: a.id,
    student_name: a.students?.display_name ?? "Student",
    exam_id: a.exam_id,
    exam_title: a.exams?.title ?? "Exam",
    status: a.status as AttemptStatus,
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    total_score: a.total_score === null ? null : Number(a.total_score),
    total_marks: a.total_marks_snapshot === null ? null : Number(a.total_marks_snapshot),
    percentage: a.percentage === null ? null : Number(a.percentage),
  }));
}

export interface EvaluationWorkspaceData {
  attempt: {
    id: string;
    exam_id: string;
    status: AttemptStatus;
    started_at: string;
    submitted_at: string | null;
    total_score: number | null;
    total_marks: number | null;
    passing_marks: number | null;
    percentage: number | null;
    evaluated_at: string | null;
    published_at: string | null;
  };
  studentName: string;
  examTitle: string;
  snapshot: import("@/lib/exams/shared").ExamSnapshot;
  answers: Array<{ paper_question_id: string; answer_text: string; mcq_option: string | null }>;
  evaluations: Array<{ paper_question_id: string; marks_awarded: number; feedback: string | null }>;
  /** Optional questions the student selected for this attempt. */
  selectedQuestionIds: string[];
  paperSignedUrl: string | null;
  paperFileName: string | null;
}

export async function getAttemptForEvaluation(
  attemptId: string
): Promise<EvaluationWorkspaceData | null> {
  if (!db()) return null;
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("*, students(display_name), exams(title, paper_document_id)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return null;

  const a = attempt as any;
  const [answersRes, evalRes, selRes] = await Promise.all([
    admin
      .from("exam_answers")
      .select("paper_question_id,answer_text,mcq_option")
      .eq("attempt_id", attemptId),
    admin
      .from("exam_evaluations")
      .select("paper_question_id,marks_awarded,feedback")
      .eq("attempt_id", attemptId),
    admin
      .from("exam_attempt_question_selections")
      .select("paper_question_id")
      .eq("attempt_id", attemptId),
  ]);

  let paperSignedUrl: string | null = null;
  let paperFileName: string | null = null;
  const docId = a.exams?.paper_document_id;
  if (docId) {
    const { data: doc } = await admin
      .from("documents")
      .select("storage_bucket,storage_path,original_filename,filename")
      .eq("id", docId)
      .maybeSingle();
    if (doc) {
      const d = doc as any;
      paperFileName = d.original_filename || d.filename;
      const { data: signed } = await admin.storage
        .from(d.storage_bucket || QUESTION_DOCUMENT_BUCKET)
        .createSignedUrl(d.storage_path, 60 * 30);
      paperSignedUrl = signed?.signedUrl ?? null;
    }
  }

  return {
    attempt: {
      id: a.id,
      exam_id: a.exam_id,
      status: a.status,
      started_at: a.started_at,
      submitted_at: a.submitted_at,
      total_score: a.total_score === null ? null : Number(a.total_score),
      total_marks: a.total_marks_snapshot === null ? null : Number(a.total_marks_snapshot),
      passing_marks: a.passing_marks_snapshot === null ? null : Number(a.passing_marks_snapshot),
      percentage: a.percentage === null ? null : Number(a.percentage),
      evaluated_at: a.evaluated_at,
      published_at: a.published_at,
    },
    studentName: a.students?.display_name ?? "Student",
    examTitle: a.exams?.title ?? "Exam",
    snapshot: a.exam_snapshot as import("@/lib/exams/shared").ExamSnapshot,
    answers: (answersRes.data ?? []).map((r: any) => ({
      paper_question_id: r.paper_question_id,
      answer_text: r.answer_text ?? "",
      mcq_option: r.mcq_option,
    })),
    evaluations: (evalRes.data ?? []).map((r: any) => ({
      paper_question_id: r.paper_question_id,
      marks_awarded: Number(r.marks_awarded),
      feedback: r.feedback,
    })),
    selectedQuestionIds: (selRes.data ?? []).map((r: any) => r.paper_question_id),
    paperSignedUrl,
    paperFileName,
  };
}
