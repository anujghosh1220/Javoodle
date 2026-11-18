"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DeleteStudentResult {
  ok: boolean;
  error?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Permanently deletes a student and all of their data.
 *
 * Dependency strategy: every table that references `students.id` declares
 * `on delete cascade` (verified in migrations 0001/0004/0005/0006):
 *   student_sessions, lesson_completions, exam_attempts
 *   (→ exam_answers, exam_evaluations, exam_answer_flags,
 *     exam_attempt_question_selections, student_answers cascade further),
 *   practice_history, xp_events, student_achievements,
 *   coding_submissions, coding_execution_runs.
 * Shared content (exams, questions, lessons, topics) never references
 * students, so it is untouched. A single DELETE is atomic — either the
 * student and all dependents are removed or nothing is.
 */
export async function deleteStudentAction(
  studentId: string
): Promise<DeleteStudentResult> {
  await requireAdmin();

  if (typeof studentId !== "string" || !UUID_RE.test(studentId)) {
    return { ok: false, error: "Invalid student." };
  }
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    return { ok: false, error: "Database is not configured." };
  }

  const admin = createAdminClient();

  const { data: student, error: findError } = await admin
    .from("students")
    .select("id,display_name")
    .eq("id", studentId)
    .maybeSingle();

  if (findError) {
    return { ok: false, error: "Could not verify the student. Please try again." };
  }
  if (!student) {
    // Already deleted or never existed — safe to report, nothing to cascade.
    return { ok: false, error: "Student not found — they may already be deleted." };
  }

  const { error } = await admin.from("students").delete().eq("id", studentId);
  if (error) {
    return { ok: false, error: "Deletion failed. Please try again." };
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true };
}
