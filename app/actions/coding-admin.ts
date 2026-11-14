"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { codingQuestionInputSchema, testCaseInputSchema, type TestCaseInput } from "@/lib/coding/shared";

async function admin() {
  await requireAdmin();
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) throw new Error("Supabase not configured");
  return createAdminClient();
}

export async function saveCodingQuestionAction(id: string | null, raw: string) {
  const a = await admin();
  const parsed = codingQuestionInputSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return { ok: false as const, error: "Invalid question data." };
  const d = parsed.data;
  if (id) {
    const { error } = await a.from("coding_questions").update({ ...d, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { data, error } = await a.from("coding_questions").insert(d).select("id").single();
    if (error || !data) return { ok: false as const, error: error?.message ?? "Insert failed." };
    id = data.id;
  }
  revalidatePath("/admin/coding");
  return { ok: true as const, id };
}

export async function setCodingQuestionStatusAction(id: string, status: "draft" | "published" | "archived") {
  const a = await admin();
  const { error } = await a.from("coding_questions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/coding");
  return { ok: true as const };
}

export async function deleteCodingQuestionAction(id: string) {
  const a = await admin();
  const { error } = await a.from("coding_questions").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/coding");
  return { ok: true as const };
}

export async function saveTestCasesAction(questionId: string, raw: string) {
  const a = await admin();
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr) || arr.length > 50) return { ok: false as const, error: "Invalid test cases." };
  const parsed = arr.map((t) => testCaseInputSchema.safeParse(t));
  if (parsed.some((p) => !p.success)) return { ok: false as const, error: "Invalid test case data." };
  await a.from("coding_question_test_cases").delete().eq("question_id", questionId);
  const rows = parsed.map((p, i) => ({ question_id: questionId, order_index: i, ...(p as { data?: TestCaseInput }).data }));
  const { error } = await a.from("coding_question_test_cases").insert(rows);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/coding/${questionId}`);
  return { ok: true as const };
}

export async function reviewCodingSubmissionAction(
  submissionId: string,
  marks: number | null,
  feedback: string,
  reviewStatus: "reviewed" | "resubmit_requested"
): Promise<{ ok: boolean; error?: string }> {
  const a = await admin();
  const { data: me } = await a.auth.getUser();
  const { data: sub } = await a.from("coding_submissions").select("id,question_id").eq("id", submissionId).maybeSingle();
  if (!sub) return { ok: false as const, error: "Submission not found." };
  const { data: q } = await a.from("coding_questions").select("marks").eq("id", (sub as { question_id: string }).question_id).maybeSingle();
  const max = Number((q as { marks?: number } | null)?.marks ?? 0);
  if (marks !== null && (!Number.isFinite(marks) || marks < 0 || marks > max)) {
    return { ok: false as const, error: `Marks must be 0–${max}.` };
  }
  const { error } = await a.from("coding_submissions").update({
    marks_awarded: marks, feedback: feedback.trim() || null,
    review_status: reviewStatus, reviewed_by: me?.user?.id ?? null,
    reviewed_at: new Date().toISOString(),
  }).eq("id", submissionId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/coding/submissions");
  return { ok: true as const };
}
