"use server";

import { getStudentSession } from "@/lib/student/session";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluatePracticeAnswer, type PracticeQuestionRow, type PracticeOptionRow } from "@/lib/practice/evaluate";
import { PRACTICE_TYPES, type PracticeType } from "@/lib/practice/data";

/**
 * Grade one practice answer server-side and persist it.
 * The client never supplies correctness — evaluation happens here against
 * the stored answer key / rubric via the service role.
 */
export async function submitPracticeAnswerAction(questionId: string, payload: unknown) {
  const session = await getStudentSession();
  if (!session?.studentId || !session.sessionRowId) {
    return { ok: false as const, error: "Please sign in again to save progress." };
  }
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    return { ok: false as const, error: "Practice saving is unavailable right now." };
  }
  if (typeof questionId !== "string" || !questionId) {
    return { ok: false as const, error: "Invalid question." };
  }

  const admin = createAdminClient();
  const { data: q } = await admin
    .from("questions")
    .select("id,type,text,marks,version,correct_answer_text,explanation,marking_rubric,status,question_status,answer_status")
    .eq("id", questionId)
    .eq("status", "approved")
    .eq("question_status", "approved")
    .eq("answer_status", "approved")
    .maybeSingle();
  if (!q || !PRACTICE_TYPES.includes(q.type as PracticeType)) {
    return { ok: false as const, error: "Question not available for practice." };
  }

  const type = q.type as PracticeType;
  const { data: options } = type === "mcq"
    ? await admin.from("question_options").select("id,question_id,is_correct").eq("question_id", questionId)
    : { data: [] as PracticeOptionRow[] };

  const result = evaluatePracticeAnswer({
    question: q as PracticeQuestionRow,
    options: (options ?? []) as PracticeOptionRow[],
    type,
    payload,
  });

  // XP: full marks for a correct answer, scaled partial credit for theory.
  const xp = result.marksAwarded >= result.maxMarks ? 10 : result.marksAwarded > 0 ? Math.max(2, Math.round(result.marksAwarded * 4)) : 0;

  const { error } = await admin.from("practice_history").insert({
    student_id: session.studentId,
    session_id: session.sessionRowId,
    question_id: questionId,
    question_version: q.version,
    mode: "practice",
    answer: payload ?? {},
    marks_awarded: result.marksAwarded,
    correct: result.correct,
    xp,
  });
  if (error) return { ok: false as const, error: "Could not save your answer — please try again." };

  if (xp > 0) {
    await admin.from("xp_events").insert({
      student_id: session.studentId,
      session_id: session.sessionRowId,
      amount: xp,
      reason: result.correct ? "practice_correct" : "practice_partial",
      ref_id: questionId,
    });
  }

  return {
    ok: true as const,
    correct: result.correct,
    marksAwarded: result.marksAwarded,
    maxMarks: result.maxMarks,
    verdict: result.verdict,
    explanation: result.explanation,
    xp,
  };
}
