import "server-only";

import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTION_DOCUMENT_BUCKET } from "@/lib/storage/documents";
import {
  isExamAvailable,
  isAttemptExpired,
  type AttemptStatus,
  type ExamPaper,
  type ExamSnapshot,
} from "@/lib/exams/shared";

/* eslint-disable @typescript-eslint/no-explicit-any */

function db(): boolean {
  return isSupabaseConfigured() && hasServiceRoleKey();
}

export interface StudentExamListItem extends ExamPaper {
  attempt_status: AttemptStatus | null;
  attempt_id: string | null;
}

/** Published, in-window exams plus this student's attempt state per exam. */
export async function listExamsForStudent(
  studentId: string | null
): Promise<StudentExamListItem[]> {
  if (!db()) return [];
  const admin = createAdminClient();
  const { data: exams } = await admin
    .from("exams")
    .select(
      "id,title,subject,class_name,description,instructions,duration_minutes,reading_time_minutes,total_marks,passing_marks,opens_at,closes_at,status,release_model_answers,paper_document_id"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const allPublished = (exams ?? []) as ExamPaper[];
  if (allPublished.length === 0) return [];

  // Attempts for every published exam (needed both for status chips and to
  // keep attempted exams visible after the availability window closes).
  const attemptsByExam = new Map<string, { id: string; status: AttemptStatus }>();
  if (studentId) {
    const { data: attempts } = await admin
      .from("exam_attempts")
      .select("id,exam_id,status")
      .eq("student_id", studentId)
      .in(
        "exam_id",
        allPublished.map((e) => e.id)
      );
    for (const a of attempts ?? []) {
      attemptsByExam.set(a.exam_id, { id: a.id, status: a.status as AttemptStatus });
    }
  }

  // Show exams inside their window, plus any exam the student has attempted
  // (so submitted/published results stay reachable after closes_at).
  return allPublished
    .filter((e) => isExamAvailable(e) || attemptsByExam.has(e.id))
    .map((e) => {
      const att = attemptsByExam.get(e.id);
      return { ...e, attempt_status: att?.status ?? null, attempt_id: att?.id ?? null };
    });
}

export interface StudentExamDetail {
  exam: ExamPaper;
  attempt: {
    id: string;
    status: AttemptStatus;
    deadline_at: string | null;
    submitted_at: string | null;
  } | null;
  /** Present only when there is no attempt yet and the exam has optional
   *  groups — drives the pre-start question-selection UI. */
  selection: {
    groups: Array<{
      id: string;
      title: string;
      pick_count: number;
      max_counted_marks: number;
    }>;
    questions: Array<{
      id: string;
      optional_group_id: string | null;
      question_number: string;
      prompt: string;
      marks: number;
    }>;
  } | null;
}

export async function getExamForStudent(
  examId: string,
  studentId: string | null
): Promise<StudentExamDetail | null> {
  if (!db()) return null;
  const admin = createAdminClient();
  const { data: exam } = await admin
    .from("exams")
    .select(
      "id,title,subject,class_name,description,instructions,duration_minutes,reading_time_minutes,total_marks,passing_marks,opens_at,closes_at,status,release_model_answers,paper_document_id"
    )
    .eq("id", examId)
    .maybeSingle();
  if (!exam || !isExamAvailable(exam as ExamPaper)) return null;

  let attempt: StudentExamDetail["attempt"] = null;
  if (studentId) {
    const { data } = await admin
      .from("exam_attempts")
      .select("id,status,deadline_at,submitted_at")
      .eq("exam_id", examId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (data) {
      attempt = {
        id: data.id,
        status: data.status as AttemptStatus,
        deadline_at: data.deadline_at,
        submitted_at: data.submitted_at,
      };
    }
  }

  // Optional-question selection data — only needed before the first attempt.
  let selection: StudentExamDetail["selection"] = null;
  if (!attempt) {
    const { data: groups } = await admin
      .from("exam_optional_groups")
      .select("id,title,pick_count,max_counted_marks")
      .eq("exam_id", examId)
      .order("order_index");
    if (groups && groups.length > 0) {
      const { data: qs } = await admin
        .from("exam_paper_questions")
        .select("id,optional_group_id,question_number,prompt,marks")
        .eq("exam_id", examId)
        .order("order_index");
      selection = {
        groups: groups.map((g: any) => ({
          id: g.id,
          title: g.title,
          pick_count: Number(g.pick_count),
          max_counted_marks: Number(g.max_counted_marks),
        })),
        questions: (qs ?? []).map((q: any) => ({
          id: q.id,
          optional_group_id: q.optional_group_id,
          question_number: q.question_number,
          prompt: q.prompt,
          marks: Number(q.marks),
        })),
      };
    }
  }

  return { exam: exam as ExamPaper, attempt, selection };
}

/** Attempt lookup that ignores the availability window — used for results,
 *  which must remain viewable after the exam closes. */
export async function getAttemptRefForStudent(
  examId: string,
  studentId: string | null
): Promise<{ id: string; status: AttemptStatus } | null> {
  if (!db() || !studentId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("exam_attempts")
    .select("id,status")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .maybeSingle();
  return data ? { id: data.id, status: data.status as AttemptStatus } : null;
}

export interface StudentAttemptState {
  attempt: {
    id: string;
    status: AttemptStatus;
    started_at: string;
    deadline_at: string | null;
    submitted_at: string | null;
    expired: boolean;
  };
  exam: {
    id: string;
    title: string;
    subject: string;
    class_name: string;
    total_marks: number;
    passing_marks: number | null;
    release_model_answers: boolean;
  };
  snapshot: ExamSnapshot;
  /** Ids of optional questions this attempt selected (empty = none/legacy). */
  selectedQuestionIds: string[];
  answers: Array<{ paper_question_id: string; answer_text: string; mcq_option: string | null }>;
  paperSignedUrl: string | null;
  result: {
    total_score: number;
    total_marks: number;
    percentage: number | null;
    passing_marks: number | null;
    passed: boolean | null;
    evaluations: Array<{
      paper_question_id: string;
      marks_awarded: number;
      feedback: string | null;
      question_number: string;
      prompt: string;
      max_marks: number;
      model_answer: string | null;
    }>;
  } | null;
}

/**
 * Full state for the exam runner / result view. Ownership is enforced by
 * matching attempt.student_id to the validated session — never client input.
 * Lazily auto-submits an in-progress attempt whose deadline has passed.
 */
export async function getAttemptForStudent(
  attemptId: string,
  studentId: string | null
): Promise<StudentAttemptState | null> {
  if (!db() || !studentId) return null;
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!attempt) return null;

  const a = attempt as any;

  // Lazy expiry: if the deadline passed while still in_progress, submit now
  // so answers are frozen and the admin inbox sees it.
  if (a.status === "in_progress" && isAttemptExpired(a.deadline_at)) {
    await admin
      .from("exam_attempts")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", attemptId)
      .eq("status", "in_progress");
    a.status = "submitted";
    a.submitted_at = new Date().toISOString();
  }

  const snapshot = a.exam_snapshot as ExamSnapshot;
  const releaseAnswers = a.status === "result_published" || a.status === "evaluated";

  // Strip model answers from the snapshot unless results are published AND
  // the exam opts in to releasing them.
  const releaseModel =
    releaseAnswers &&
    (snapshot?.exam?.release_model_answers ?? false);
  const safeSnapshot: ExamSnapshot = snapshot
    ? {
        ...snapshot,
        questions: snapshot.questions.map((q) => ({
          ...q,
          model_answer: releaseModel ? q.model_answer : null,
        })),
      }
    : snapshot;

  const [answersRes, evalRes, examRes, selRes] = await Promise.all([
    admin
      .from("exam_answers")
      .select("paper_question_id,answer_text,mcq_option")
      .eq("attempt_id", attemptId),
    releaseAnswers
      ? admin
          .from("exam_evaluations")
          .select("paper_question_id,marks_awarded,feedback")
          .eq("attempt_id", attemptId)
      : Promise.resolve({ data: [] }),
    admin
      .from("exams")
      .select("id,title,subject,class_name,total_marks,passing_marks,release_model_answers,paper_document_id")
      .eq("id", a.exam_id)
      .maybeSingle(),
    admin
      .from("exam_attempt_question_selections")
      .select("paper_question_id")
      .eq("attempt_id", attemptId),
  ]);

  let paperSignedUrl: string | null = null;
  const docId = examRes.data ? (examRes.data as any).paper_document_id : null;
  const inProgress = a.status === "in_progress";
  if (docId && inProgress) {
    const { data: doc } = await admin
      .from("documents")
      .select("storage_bucket,storage_path")
      .eq("id", docId)
      .maybeSingle();
    if (doc) {
      const d = doc as any;
      const { data: signed } = await admin.storage
        .from(d.storage_bucket || QUESTION_DOCUMENT_BUCKET)
        .createSignedUrl(d.storage_path, 60 * 60 * 4);
      paperSignedUrl = signed?.signedUrl ?? null;
    }
  }

  let result: StudentAttemptState["result"] = null;
  if (releaseAnswers) {
    const questionsById = new Map(
      (snapshot?.questions ?? []).map((q: any) => [q.id, q])
    );
    result = {
      total_score: a.total_score === null ? 0 : Number(a.total_score),
      total_marks:
        a.total_marks_snapshot === null ? 0 : Number(a.total_marks_snapshot),
      percentage: a.percentage === null ? null : Number(a.percentage),
      passing_marks:
        a.passing_marks_snapshot === null ? null : Number(a.passing_marks_snapshot),
      passed:
        a.passing_marks_snapshot === null || a.passing_marks_snapshot === undefined
          ? null
          : Number(a.total_score ?? 0) >= Number(a.passing_marks_snapshot),
      evaluations: (evalRes.data ?? []).map((r: any) => {
        const q = questionsById.get(r.paper_question_id) as any;
        return {
          paper_question_id: r.paper_question_id,
          marks_awarded: Number(r.marks_awarded),
          feedback: r.feedback,
          question_number: q?.question_number ?? "—",
          prompt: q?.prompt ?? "",
          max_marks: q ? Number(q.marks) : 0,
          model_answer: releaseModel ? q?.model_answer ?? null : null,
        };
      }),
    };
  }

  return {
    attempt: {
      id: a.id,
      status: a.status,
      started_at: a.started_at,
      deadline_at: a.deadline_at,
      submitted_at: a.submitted_at,
      expired: isAttemptExpired(a.deadline_at),
    },
    exam: examRes.data
      ? {
          id: (examRes.data as any).id,
          title: (examRes.data as any).title,
          subject: (examRes.data as any).subject,
          class_name: (examRes.data as any).class_name,
          total_marks: Number((examRes.data as any).total_marks),
          passing_marks:
            (examRes.data as any).passing_marks === null
              ? null
              : Number((examRes.data as any).passing_marks),
          release_model_answers: Boolean((examRes.data as any).release_model_answers),
        }
      : {
          id: a.exam_id,
          title: snapshot?.exam?.title ?? "Exam",
          subject: snapshot?.exam?.subject ?? "",
          class_name: snapshot?.exam?.class_name ?? "",
          total_marks: snapshot?.exam?.total_marks ?? 0,
          passing_marks: snapshot?.exam?.passing_marks ?? null,
          release_model_answers: snapshot?.exam?.release_model_answers ?? false,
        },
    snapshot: safeSnapshot,
    selectedQuestionIds: (selRes.data ?? []).map((r: any) => r.paper_question_id),
    answers: (answersRes.data ?? []).map((r: any) => ({
      paper_question_id: r.paper_question_id,
      answer_text: r.answer_text ?? "",
      mcq_option: r.mcq_option,
    })),
    paperSignedUrl,
    result,
  };
}
