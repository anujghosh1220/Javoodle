"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { requireAdmin, getAdminUser } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";

function ensureDb() {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) throw new Error("Supabase/service role not configured");
}

async function snapshotQuestion(admin: ReturnType<typeof createAdminClient>, questionId: string) {
  const [{ data: q }, { data: options }, { data: tcs }, { data: rubrics }] = await Promise.all([
    admin.from("questions").select("*").eq("id", questionId).single(),
    admin.from("question_options").select("*").eq("question_id", questionId).order("order_index"),
    admin.from("test_cases").select("*").eq("question_id", questionId).order("order_index"),
    admin.from("marking_rubrics").select("*").eq("question_id", questionId),
  ]);
  return { question: q, options: options ?? [], test_cases: tcs ?? [], marking_rubrics: rubrics ?? [] };
}

async function recordReviewEvent(admin: ReturnType<typeof createAdminClient>, args: {
  questionId: string; action: string; field?: string; reason?: string | null;
  fromQuestionStatus?: string | null; toQuestionStatus?: string | null;
  fromAnswerStatus?: string | null; toAnswerStatus?: string | null;
  previousVersion?: number | null; newVersion?: number | null;
  previousSnapshot?: any; newSnapshot?: any; metadata?: any;
}) {
  const user = await getAdminUser();
  await admin.from("question_review_events").insert({
    question_id: args.questionId,
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    action: args.action,
    field: args.field ?? null,
    reason: args.reason ?? null,
    from_question_status: args.fromQuestionStatus ?? null,
    to_question_status: args.toQuestionStatus ?? null,
    from_answer_status: args.fromAnswerStatus ?? null,
    to_answer_status: args.toAnswerStatus ?? null,
    previous_version: args.previousVersion ?? null,
    new_version: args.newVersion ?? null,
    previous_snapshot: args.previousSnapshot ?? null,
    new_snapshot: args.newSnapshot ?? null,
    metadata: args.metadata ?? {},
  });
}

function revalidateQuestionPaths(id?: string) {
  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/review");
  revalidatePath("/admin/questions/bank");
  if (id) revalidatePath(`/admin/questions/${id}`);
}

export async function updateQuestionReviewAction(args: {
  questionId: string;
  questionStatus?: "pending_review" | "approved" | "rejected" | "needs_revision";
  answerStatus?: "unverified" | "approved" | "rejected" | "needs_revision";
  reason?: string;
  field?: string;
}) {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();
  const { data: before } = await admin.from("questions").select("question_status,answer_status,version").eq("id", args.questionId).single();
  if (!before) return { ok: false as const, error: "Question not found" };
  const patch: any = { updated_at: new Date().toISOString() };
  if (args.questionStatus) patch.question_status = args.questionStatus;
  if (args.answerStatus) patch.answer_status = args.answerStatus;
  const { error } = await admin.from("questions").update(patch).eq("id", args.questionId);
  if (error) return { ok: false as const, error: error.message };
  await recordReviewEvent(admin, {
    questionId: args.questionId,
    action: args.field ? `updated_${args.field}` : "status_change",
    field: args.field ?? (args.questionStatus && args.answerStatus ? "question_and_answer_status" : args.questionStatus ? "question_status" : "answer_status"),
    reason: args.reason ?? null,
    fromQuestionStatus: (before as any).question_status,
    toQuestionStatus: args.questionStatus ?? (before as any).question_status,
    fromAnswerStatus: (before as any).answer_status,
    toAnswerStatus: args.answerStatus ?? (before as any).answer_status,
    previousVersion: (before as any).version,
    newVersion: (before as any).version,
  });
  revalidateQuestionPaths(args.questionId);
  return { ok: true as const };
}

export async function saveQuestionEditsAction(args: {
  questionId: string;
  patch: any;
  options?: any[];
  testCases?: any[];
  rubrics?: any[];
  reason?: string;
}) {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();
  const prev = await snapshotQuestion(admin, args.questionId);
  if (!prev.question) return { ok: false as const, error: "Question not found" };
  const prevVersion = (prev.question as any).version ?? 1;
  const newVersion = prevVersion + 1;

  // update main question
  const { error: upErr } = await admin.from("questions").update({
    ...args.patch,
    version: newVersion,
    updated_at: new Date().toISOString(),
  }).eq("id", args.questionId);
  if (upErr) return { ok: false as const, error: upErr.message };

  // replace child rows if provided
  if (args.options) {
    await admin.from("question_options").delete().eq("question_id", args.questionId);
    if (args.options.length) {
      const rows = args.options.map((o: any, i: number) => ({
        question_id: args.questionId,
        label: String(o.label ?? ""),
        text: String(o.text ?? ""),
        is_correct: o.is_correct === true,
        order_index: i,
      })).filter((r) => r.label || r.text);
      if (rows.length) await admin.from("question_options").insert(rows);
    }
  }
  if (args.testCases) {
    await admin.from("test_cases").delete().eq("question_id", args.questionId);
    if (args.testCases.length) {
      const rows = args.testCases.map((t: any, i: number) => ({
        question_id: args.questionId,
        input: String(t?.input ?? ""),
        expected_output: String(t?.expected_output ?? t?.output ?? ""),
        is_hidden: t?.is_hidden !== false,
        order_index: i,
      })).filter((r) => r.input !== "" || r.expected_output !== "");
      if (rows.length) await admin.from("test_cases").insert(rows);
    }
  }
  if (args.rubrics) {
    await admin.from("marking_rubrics").delete().eq("question_id", args.questionId);
    if (args.rubrics.length) {
      const rows = args.rubrics.map((c: any) => ({
        question_id: args.questionId,
        criteria: String(c?.criteria ?? c?.text ?? ""),
        max_marks: Number(c?.max_marks ?? c?.marks ?? 0) || 0.5,
        keywords: Array.isArray(c?.keywords) ? c.keywords : [],
      })).filter((r) => r.criteria);
      if (rows.length) await admin.from("marking_rubrics").insert(rows);
    }
  }

  const next = await snapshotQuestion(admin, args.questionId);
  await admin.from("question_versions").insert({ question_id: args.questionId, version: newVersion, snapshot: next });
  await recordReviewEvent(admin, {
    questionId: args.questionId,
    action: "edited",
    field: "content",
    reason: args.reason ?? null,
    fromQuestionStatus: (prev.question as any).question_status,
    toQuestionStatus: (next.question as any)?.question_status ?? (prev.question as any).question_status,
    fromAnswerStatus: (prev.question as any).answer_status,
    toAnswerStatus: (next.question as any)?.answer_status ?? (prev.question as any).answer_status,
    previousVersion: prevVersion,
    newVersion,
    previousSnapshot: prev,
    newSnapshot: next,
  });

  revalidateQuestionPaths(args.questionId);
  return { ok: true as const, version: newVersion };
}

export async function deleteQuestionAction(questionId: string) {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();
  await admin.from("questions").delete().eq("id", questionId);
  revalidateQuestionPaths();
  return { ok: true as const };
}

export async function flagQuestionAction(questionId: string, reason: string) {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();
  await recordReviewEvent(admin, { questionId, action: "flagged", reason, field: "manual_review" });
  // keep statuses but mark needs_revision for visibility? better set question needs_revision if pending
  const { data: q } = await admin.from("questions").select("question_status").eq("id", questionId).single();
  if (q && (q as any).question_status === "pending_review") {
    await admin.from("questions").update({ question_status: "needs_revision" }).eq("id", questionId);
  }
  revalidateQuestionPaths(questionId);
  return { ok: true as const };
}


