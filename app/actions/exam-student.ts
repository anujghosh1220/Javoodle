"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentSession } from "@/lib/student/session";
import {
  isAttemptExpired,
  isExamAvailable,
  computeCountedScore,
  requiredQuestionIds,
  percentageOf,
} from "@/lib/exams/shared";
import type { ExamSnapshot } from "@/lib/exams/shared";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_ANSWER_CHARS = 50000;

function db(): boolean {
  return isSupabaseConfigured() && hasServiceRoleKey();
}

export interface ExamActionResult {
  ok: boolean;
  error?: string;
  attemptId?: string;
}

/**
 * Start (or resume) an attempt. Creates the attempt row with a frozen
 * exam_snapshot so later admin edits cannot change it. The unique
 * (exam_id, student_id) index makes concurrent double-starts safe: the
 * loser re-reads the winner's attempt.
 */
export async function startExamAction(
  examId: string,
  selectedQuestionIds?: string[]
): Promise<ExamActionResult> {
  const session = await getStudentSession();
  if (!session?.studentId || !session.sessionRowId) {
    return { ok: false, error: "Please sign in again to start the exam." };
  }
  if (!db()) return { ok: false, error: "Exam service unavailable." };
  if (!/^[0-9a-f-]{36}$/i.test(examId)) return { ok: false, error: "Invalid exam." };

  const admin = createAdminClient();

  // Re-check availability server-side.
  const { data: exam } = await admin
    .from("exams")
    .select("*")
    .eq("id", examId)
    .maybeSingle();
  if (!exam || !isExamAvailable(exam as any)) {
    return { ok: false, error: "This exam is not currently available." };
  }

  // Existing attempt? Return it (resume) or report its state.
  const { data: existing } = await admin
    .from("exam_attempts")
    .select("id,status")
    .eq("exam_id", examId)
    .eq("student_id", session.studentId)
    .maybeSingle();
  if (existing) {
    if (existing.status === "in_progress") {
      return { ok: true, attemptId: existing.id };
    }
    return {
      ok: false,
      error: "You have already completed this exam. Results appear on your Exams page once published.",
    };
  }

  // Build the frozen snapshot (sections + optional groups + questions).
  const [sectionsRes, questionsRes, groupsRes] = await Promise.all([
    admin.from("exam_sections").select("*").eq("exam_id", examId).order("order_index"),
    admin
      .from("exam_paper_questions")
      .select("*")
      .eq("exam_id", examId)
      .order("order_index"),
    admin
      .from("exam_optional_groups")
      .select("*")
      .eq("exam_id", examId)
      .order("order_index"),
  ]);
  const sections = sectionsRes.data ?? [];
  const questions = questionsRes.data ?? [];
  const groups = groupsRes.data ?? [];
  if (questions.length === 0) {
    return { ok: false, error: "This exam has no questions configured yet." };
  }

  // Optional groups: the student must pick exactly pick_count questions per
  // group before the attempt starts (only for NEW attempts — resumes skip
  // this because selections are already stored).
  const selectionsToInsert: string[] = [];
  if (groups.length > 0) {
    const selected = new Set((selectedQuestionIds ?? []).filter((id) => typeof id === "string"));
    for (const g of groups as any[]) {
      const members = (questions as any[]).filter((q) => q.optional_group_id === g.id);
      const picked = members.filter((q) => selected.has(q.id));
      if (picked.length !== Number(g.pick_count)) {
        return {
          ok: false,
          error: `"${g.title}": choose exactly ${g.pick_count} question${g.pick_count === 1 ? "" : "s"} (${picked.length} selected).`,
        };
      }
      for (const q of picked) selectionsToInsert.push(q.id);
    }
    // Reject selections that aren't members of any group.
    const memberIds = new Set(
      (questions as any[]).filter((q) => q.optional_group_id).map((q) => q.id)
    );
    for (const id of selected) {
      if (memberIds.has(id) === false && questions.some((q: any) => q.id === id && !q.optional_group_id)) {
        return { ok: false, error: "Invalid question selection." };
      }
    }
  }

  const e = exam as any;
  const snapshot: ExamSnapshot = {
    version: 1,
    exam: {
      title: e.title,
      subject: e.subject,
      class_name: e.class_name,
      description: e.description ?? null,
      instructions: e.instructions ?? null,
      duration_minutes: e.duration_minutes,
      reading_time_minutes: e.reading_time_minutes ?? 0,
      total_marks: Number(e.total_marks),
      passing_marks: e.passing_marks === null ? null : Number(e.passing_marks),
      release_model_answers: Boolean(e.release_model_answers),
    },
    sections: sections.map((s: any) => ({
      id: s.id,
      title: s.title,
      order_index: s.order_index,
      marks: Number(s.marks ?? 0),
    })),
    optional_groups: (groups as any[]).map((g) => ({
      id: g.id,
      title: g.title,
      pick_count: Number(g.pick_count),
      max_counted_marks: Number(g.max_counted_marks),
      order_index: g.order_index,
    })),
    questions: questions.map((q: any) => ({
      id: q.id,
      section_id: q.section_id,
      optional_group_id: q.optional_group_id ?? null,
      question_number: q.question_number,
      prompt: q.prompt,
      question_type: q.question_type,
      marks: Number(q.marks),
      options: Array.isArray(q.options) ? q.options : [],
      model_answer: q.model_answer ?? null,
      order_index: q.order_index,
    })),
  };

  const now = new Date();
  const totalMinutes =
    Number(e.duration_minutes) + Number(e.reading_time_minutes ?? 0);
  const deadline = new Date(now.getTime() + totalMinutes * 60 * 1000);

  const { data: inserted, error } = await admin
    .from("exam_attempts")
    .insert({
      exam_id: examId,
      student_id: session.studentId,
      session_id: session.sessionRowId,
      status: "in_progress",
      started_at: now.toISOString(),
      deadline_at: deadline.toISOString(),
      exam_snapshot: snapshot,
      total_marks_snapshot: Number(e.total_marks),
      passing_marks_snapshot: e.passing_marks === null ? null : Number(e.passing_marks),
      duration_minutes_snapshot: Number(e.duration_minutes),
      reading_time_minutes_snapshot: Number(e.reading_time_minutes ?? 0),
    })
    .select("id")
    .single();

  if (error || !inserted) {
    // Unique-violation race: another tab/request started first — resume it.
    const { data: retry } = await admin
      .from("exam_attempts")
      .select("id,status")
      .eq("exam_id", examId)
      .eq("student_id", session.studentId)
      .maybeSingle();
    if (retry?.status === "in_progress") {
      return { ok: true, attemptId: retry.id };
    }
    return { ok: false, error: "Could not start the exam. Please try again." };
  }

  // Persist the student's optional-question selections (immutable once
  // written — evaluation only honours these rows).
  if (selectionsToInsert.length > 0) {
    const { error: selErr } = await admin
      .from("exam_attempt_question_selections")
      .insert(
        selectionsToInsert.map((pid) => ({
          attempt_id: inserted.id,
          paper_question_id: pid,
        }))
      );
    if (selErr) {
      // Roll back the attempt so the student can retry cleanly.
      await admin.from("exam_attempts").delete().eq("id", inserted.id);
      return { ok: false, error: "Could not record your question selection. Please try again." };
    }
  }

  revalidatePath("/exams");
  revalidatePath(`/exams/${examId}`);
  return { ok: true, attemptId: inserted.id };
}

/**
 * Autosave one answer. Server-side validation: attempt must belong to the
 * session student, be in_progress, and be before the deadline.
 */
export async function saveExamAnswerAction(
  attemptId: string,
  paperQuestionId: string,
  answerText: string,
  mcqOption: string | null
): Promise<ExamActionResult> {
  const session = await getStudentSession();
  if (!session?.studentId) return { ok: false, error: "Session expired." };
  if (!db()) return { ok: false, error: "Exam service unavailable." };
  if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !/^[0-9a-f-]{36}$/i.test(paperQuestionId)) {
    return { ok: false, error: "Invalid request." };
  }
  const text = String(answerText ?? "").slice(0, MAX_ANSWER_CHARS);
  const mcq = mcqOption ? String(mcqOption).slice(0, 8) : null;

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id,status,deadline_at,exam_snapshot")
    .eq("id", attemptId)
    .eq("student_id", session.studentId)
    .maybeSingle();
  if (!attempt) return { ok: false, error: "Attempt not found." };
  if (attempt.status !== "in_progress") {
    return { ok: false, error: "This exam has already been submitted." };
  }
  if (isAttemptExpired(attempt.deadline_at)) {
    return { ok: false, error: "Time is up — the exam was auto-submitted." };
  }

  // paper_question_id must belong to this attempt's frozen snapshot.
  const snapshot = attempt.exam_snapshot as ExamSnapshot;
  const q = snapshot?.questions?.find((x) => x.id === paperQuestionId);
  if (!q) return { ok: false, error: "Unknown question." };

  // Optional questions: answers are only accepted for the student's
  // recorded selections.
  if (q.optional_group_id && (snapshot?.optional_groups ?? []).length > 0) {
    const { data: sel } = await admin
      .from("exam_attempt_question_selections")
      .select("paper_question_id")
      .eq("attempt_id", attemptId)
      .eq("paper_question_id", paperQuestionId)
      .maybeSingle();
    if (!sel) {
      return { ok: false, error: "This question was not selected for your attempt." };
    }
  }

  if (q.question_type === "mcq" && mcq) {
    const valid = (q.options ?? []).some((o) => o.label === mcq);
    if (!valid) return { ok: false, error: "Invalid option." };
  }

  const { error } = await admin.from("exam_answers").upsert(
    {
      attempt_id: attemptId,
      paper_question_id: paperQuestionId,
      answer_text: text,
      mcq_option: mcq,
      saved_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id,paper_question_id" }
  );
  if (error) return { ok: false, error: "Could not save your answer. Please retry." };
  return { ok: true };
}

/** Toggle the mark-for-review flag on an answer. */
export async function toggleExamFlagAction(
  attemptId: string,
  paperQuestionId: string,
  flagged: boolean
): Promise<ExamActionResult> {
  const session = await getStudentSession();
  if (!session?.studentId) return { ok: false, error: "Session expired." };
  if (!db()) return { ok: false, error: "Exam service unavailable." };
  if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !/^[0-9a-f-]{36}$/i.test(paperQuestionId)) {
    return { ok: false, error: "Invalid request." };
  }
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id,status")
    .eq("id", attemptId)
    .eq("student_id", session.studentId)
    .maybeSingle();
  if (!attempt) return { ok: false, error: "Attempt not found." };
  if (attempt.status !== "in_progress") {
    return { ok: false, error: "This exam has already been submitted." };
  }
  const { error } = await admin.from("exam_answers").upsert(
    {
      attempt_id: attemptId,
      paper_question_id: paperQuestionId,
      flagged: !!flagged,
      saved_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id,paper_question_id" }
  );
  if (error) return { ok: false, error: "Could not update flag." };
  return { ok: true };
}

/** Final submission. Idempotent — safe to call twice or after time expiry. */
export async function submitExamAction(attemptId: string): Promise<ExamActionResult> {
  const session = await getStudentSession();
  if (!session?.studentId) return { ok: false, error: "Session expired." };
  if (!db()) return { ok: false, error: "Exam service unavailable." };
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) return { ok: false, error: "Invalid attempt." };

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id,status,exam_snapshot,total_marks_snapshot,passing_marks_snapshot")
    .eq("id", attemptId)
    .eq("student_id", session.studentId)
    .maybeSingle();
  if (!attempt) return { ok: false, error: "Attempt not found." };
  if (attempt.status !== "in_progress") {
    // Already submitted — treat as success (idempotent).
    return { ok: true };
  }

  const { error } = await admin
    .from("exam_attempts")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("student_id", session.studentId)
    .eq("status", "in_progress");
  if (error) return { ok: false, error: "Could not submit the exam. Please retry." };

  // Auto-evaluate MCQs server-side from the frozen snapshot, then refresh
  // totals/lifecycle. Failure here must never fail the submission itself.
  try {
    await autoEvaluateMcqAndRefresh(admin, attemptId);
  } catch {
    // Manual evaluation remains available as fallback.
  }

  revalidatePath("/exams");
  return { ok: true };
}

/**
 * Server-side MCQ auto-grading + evaluation-state refresh.
 * Correctness is decided from exam_snapshot (frozen at attempt start) and
 * exam_answers — never from client data.
 */
async function autoEvaluateMcqAndRefresh(
  admin: ReturnType<typeof createAdminClient>,
  attemptId: string
): Promise<void> {
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id,status,exam_snapshot,total_marks_snapshot,passing_marks_snapshot,evaluated_at")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return;
  const a = attempt as any;
  const snapshot = a.exam_snapshot as ExamSnapshot;

  const mcqQuestions = (snapshot?.questions ?? []).filter(
    (q) => q.question_type === "mcq"
  );

  if (mcqQuestions.length > 0) {
    const { data: answers } = await admin
      .from("exam_answers")
      .select("paper_question_id,answer_text,mcq_option")
      .eq("attempt_id", attemptId);
    const ansMap = new Map(
      (answers ?? []).map((r: any) => [r.paper_question_id, r])
    );

    const rows = mcqQuestions.map((q) => {
      const ans = ansMap.get(q.id) as any;
      const chosenLabel = ans?.mcq_option ?? null;
      const chosenText = chosenLabel
        ? (q.options ?? []).find((o) => o.label === chosenLabel)?.text ?? null
        : null;
      const correct = (q.model_answer ?? "").trim().toLowerCase();
      const candidates = [chosenText, chosenLabel]
        .filter((c): c is string => !!c)
        .map((c) => c.trim().toLowerCase());
      const right = correct.length > 0 && candidates.includes(correct);
      return {
        attempt_id: attemptId,
        paper_question_id: q.id,
        marks_awarded: right ? Number(q.marks) : 0,
        feedback: right ? "Correct — auto-evaluated" : "Incorrect — auto-evaluated",
        evaluated_by: null,
        evaluated_at: new Date().toISOString(),
      };
    });

    const { error } = await admin
      .from("exam_evaluations")
      .upsert(rows, { onConflict: "attempt_id,paper_question_id" });
    if (error) return; // fall back to manual evaluation
  }

  // Recompute totals + lifecycle (mirrors admin refreshAttemptEvaluation).
  const { data: evals } = await admin
    .from("exam_evaluations")
    .select("paper_question_id,marks_awarded")
    .eq("attempt_id", attemptId);
  const { data: selRows } = await admin
    .from("exam_attempt_question_selections")
    .select("paper_question_id")
    .eq("attempt_id", attemptId);
  const selections = new Set((selRows ?? []).map((r: any) => r.paper_question_id));

  const required = requiredQuestionIds(snapshot, selections);
  const evaluatedIds = new Set((evals ?? []).map((e: any) => e.paper_question_id));
  const allEvaluated =
    required.size > 0 && [...required].every((id) => evaluatedIds.has(id));

  const { totalScore } = computeCountedScore(
    (evals ?? []).map((e: any) => ({
      paper_question_id: e.paper_question_id,
      marks_awarded: Number(e.marks_awarded),
    })),
    snapshot,
    selections
  );
  const totalMarks =
    a.total_marks_snapshot === null ? null : Number(a.total_marks_snapshot);
  const percentage = totalMarks ? percentageOf(totalScore, totalMarks) : null;

  let status = a.status as string;
  const now = new Date().toISOString();
  if (status === "submitted") status = "under_evaluation";
  if (status === "under_evaluation" && allEvaluated) {
    status = "evaluation_completed";
  }

  await admin
    .from("exam_attempts")
    .update({
      status,
      total_score: totalScore,
      percentage,
      evaluated_at: allEvaluated ? now : a.evaluated_at ?? null,
    })
    .eq("id", attemptId);
}
