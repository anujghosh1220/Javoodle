"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  importFileSchema,
  flattenQuestions,
  type QuestionImportItem,
} from "@/lib/question/import-schema";

export interface ImportIssue {
  index: number;
  question?: string;
  field?: string;
  message: string;
}

export interface ImportPreview {
  ok: boolean;
  errors?: ImportIssue[];
  count?: number;
  duplicates?: string[];
}

import { normalizeQuestionText } from "@/lib/question/normalize";

/** Validate raw JSON text and return structured issues (no DB writes). */
export async function previewImport(raw: string): Promise<ImportPreview> {
  await requireAdmin();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, errors: [{ index: -1, message: "Invalid JSON syntax." }] };
  }

  const parsed = importFileSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => ({
        index: i.path[1] as number ?? -1,
        field: i.path.slice(2).join("."),
        message: i.message,
      })),
    };
  }

  const flat = flattenQuestions(parsed.data.questions);

  // MCQ consistency checks beyond zod
  const errors: ImportIssue[] = [];
  flat.forEach((q, i) => {
    if (q.question_type === "mcq") {
      if (!q.options?.length) {
        errors.push({ index: i, field: "options", message: "MCQ requires options." });
      }
      if (q.options?.length && !q.correct_option) {
        errors.push({ index: i, field: "correct_option", message: "MCQ requires correct_option label." });
      }
      if (q.correct_option && q.options &&
          !q.options.some((o) => o.label === q.correct_option)) {
        errors.push({ index: i, field: "correct_option", message: `correct_option "${q.correct_option}" not in options.` });
      }
    }
    if (q.question_type === "coding" && q.test_cases.length === 0) {
      errors.push({ index: i, field: "test_cases", message: "Coding questions should include test_cases." });
    }
    const rubricTotal = q.marking_rubric.reduce((s, r) => s + r.max_marks, 0);
    if (q.marking_rubric.length && Math.abs(rubricTotal - q.marks) > 0.01) {
      errors.push({ index: i, field: "marking_rubric", message: `Rubric totals ${rubricTotal} but marks=${q.marks}.` });
    }
  });
  if (errors.length) return { ok: false, errors, count: flat.length };

  // Duplicate check against existing approved/pending questions
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("questions")
    .select("text")
    .in("status", ["pending", "pending_review", "approved"]);
  const seen = new Set((existing ?? []).map((q) => normalizeQuestionText(q.text)));
  const duplicates = flat
    .filter((q) => seen.has(normalizeQuestionText(q.question_text)))
    .map((q) => q.question_text.slice(0, 80));

  return { ok: true, count: flat.length, duplicates };
}

/** Import validated questions as pending_review. Returns batch summary. */
export async function importQuestions(
  raw: string,
  filename?: string
): Promise<{ ok: boolean; error?: string; imported?: number; batchId?: string }> {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const preview = await previewImport(raw);
  if (!preview.ok) return { ok: false, error: "Validation failed — fix errors first." };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
  const parsed = importFileSchema.parse(json);
  const flat = flattenQuestions(parsed.questions);

  // Resolve topic names -> ids (create missing topics as draft phase 1? NO —
  // only link existing topics; unknown names go to provenance for review).
  const { data: topics } = await admin.from("topics").select("id, name");
  const topicByName = new Map(
    (topics ?? []).map((t) => [t.name.trim().toLowerCase(), t.id])
  );

  const rows = flat.map((q: QuestionImportItem, i: number) => {
    const topicIds = q.topic_names
      .map((n) => topicByName.get(n.trim().toLowerCase()))
      .filter(Boolean) as string[];
    const isMcq = q.question_type === "mcq";
    const correctText = isMcq && q.correct_option
      ? q.options?.find((o) => o.label === q.correct_option)?.text ?? null
      : (q.proposed_answer ?? null);

    return {
      topic_id: topicIds[0] ?? null,
      type: mapType(q.question_type),
      text: q.question_text,
      marks: q.marks,
      difficulty: q.difficulty,
      source_document_id: q.source_document_id ?? null,
      source_page: q.source_page ?? null,
      source_year: q.source_year ?? null,
      status: "pending_review",
      answer_status: correctText || q.model_answer || q.reference_solution
        ? "unverified"
        : "unverified",
      correct_answer_text: correctText,
      explanation: q.explanation ?? null,
      ai_metadata: {
        proposed_answer: q.proposed_answer ?? null,
        model_answer: q.model_answer ?? null,
        reference_solution: q.reference_solution ?? null,
        provenance: q.extra ?? {},
        imported_by: user.email,
        import_index: i,
        unmatched_topics: q.topic_names.filter(
          (n) => !topicByName.has(n.trim().toLowerCase())
        ),
      },
      source_question_number: q.source_question_number ?? null,
      provenance: { subquestions: q.subquestions ? true : undefined, extra: q.extra },
    };
  });

  // Batch insert questions, then children (options, test cases, rubrics)
  const { data: inserted, error } = await admin
    .from("questions")
    .insert(rows)
    .select("id");
  if (error || !inserted) {
    return { ok: false, error: `Insert failed: ${error?.message ?? "unknown"}` };
  }

  const optionRows: object[] = [];
  const testRows: object[] = [];
  const rubricRows: object[] = [];
  inserted.forEach((q, i) => {
    const item = flat[i];
    (item.options ?? []).forEach((o, j) =>
      optionRows.push({
        question_id: q.id, label: o.label, text: o.text,
        is_correct: o.label === item.correct_option,
        order_index: j,
      })
    );
    item.test_cases.forEach((t, j) =>
      testRows.push({
        question_id: q.id, input: t.input,
        expected_output: t.expected_output, is_hidden: t.is_hidden,
        order_index: j,
      })
    );
    item.marking_rubric.forEach((r) =>
      rubricRows.push({
        question_id: q.id, criteria: r.criteria,
        max_marks: r.max_marks, keywords: r.keywords,
      })
    );
  });

  const results = await Promise.all([
    optionRows.length ? admin.from("question_options").insert(optionRows) : null,
    testRows.length ? admin.from("test_cases").insert(testRows) : null,
    rubricRows.length ? admin.from("marking_rubrics").insert(rubricRows) : null,
  ]);
  const childErr = results.find((r) => r?.error);
  if (childErr?.error) {
    // Roll back parent rows to keep import atomic-ish
    await admin.from("questions").delete().in("id", inserted.map((q) => q.id));
    return { ok: false, error: `Child insert failed: ${childErr.error.message}` };
  }

  const { data: batch } = await admin
    .from("question_import_batches")
    .insert({
      filename: filename ?? null,
      item_count: flat.length,
      imported_count: inserted.length,
      failed_count: 0,
      errors: preview.duplicates?.length
        ? [{ type: "duplicates", items: preview.duplicates }]
        : [],
    })
    .select("id")
    .single();

  return { ok: true, imported: inserted.length, batchId: batch?.id };
}

function mapType(t: QuestionImportItem["question_type"]) {
  const map: Record<string, string> = {
    mcq: "mcq",
    fill_blank: "fib",
    true_false: "truefalse",
    output_prediction: "output",
    find_error: "error",
    theory: "theory",
    coding: "program",
  };
  return map[t];
}

// ---------------------------------------------------------------------------
// Review actions
// ---------------------------------------------------------------------------

async function logEvent(
  admin: ReturnType<typeof createAdminClient>,
  questionId: string,
  event: string,
  actor: string,
  payload: object = {}
) {
  await admin.from("question_review_events").insert({
    question_id: questionId, event, actor, payload,
  });
}

export async function setQuestionStatus(
  questionId: string,
  status: "approved" | "rejected" | "needs_revision" | "pending_review",
  reason?: string
) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("questions")
    .update({ status })
    .eq("id", questionId);
  if (error) return { ok: false as const, error: error.message };
  await logEvent(admin, questionId, `status_${status}`, user.email ?? "admin", {
    reason: reason ?? null,
  });
  return { ok: true as const };
}

export async function setAnswerStatus(
  questionId: string,
  status: "approved" | "rejected" | "needs_revision" | "unverified",
  reason?: string
) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("questions")
    .update({
      answer_status: status,
      answer_verified_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", questionId);
  if (error) return { ok: false as const, error: error.message };
  await logEvent(admin, questionId, `answer_${status}`, user.email ?? "admin", {
    reason: reason ?? null,
  });
  return { ok: true as const };
}

/** Snapshot current question+children into question_versions, then update. */
export async function updateQuestion(
  questionId: string,
  patch: {
    text?: string;
    marks?: number;
    difficulty?: number;
    topic_id?: string | null;
    correct_answer_text?: string | null;
    explanation?: string | null;
    ai_metadata?: Record<string, unknown>;
  }
) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  // 1. Fetch current full state for the version snapshot
  const [q, opts, cases, rubrics] = await Promise.all([
    admin.from("questions").select("*").eq("id", questionId).single(),
    admin.from("question_options").select("*").eq("question_id", questionId),
    admin.from("test_cases").select("*").eq("question_id", questionId),
    admin.from("marking_rubrics").select("*").eq("question_id", questionId),
  ]);
  if (q.error || !q.data) return { ok: false as const, error: "Question not found." };

  const { data: latest } = await admin
    .from("question_versions")
    .select("version")
    .eq("question_id", questionId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (latest?.version ?? q.data.version) + 1;

  await admin.from("question_versions").insert({
    question_id: questionId,
    version: nextVersion,
    snapshot: {
      question: q.data,
      options: opts.data ?? [],
      test_cases: cases.data ?? [],
      marking_rubrics: rubrics.data ?? [],
    },
  });

  const { error } = await admin
    .from("questions")
    .update({ ...patch, version: nextVersion })
    .eq("id", questionId);
  if (error) return { ok: false as const, error: error.message };

  await logEvent(admin, questionId, "edited", user.email ?? "admin", {
    fields: Object.keys(patch),
    version: nextVersion,
  });
  return { ok: true as const, version: nextVersion };
}

export async function deleteQuestion(questionId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("questions").delete().eq("id", questionId);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
