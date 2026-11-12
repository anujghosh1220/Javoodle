/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";
import {
  type ImportQuestion,
  validateImportPayload,
  normalizeTextForDedup,
  similarity,
} from "./schema";

export interface DuplicateCandidate {
  incomingRef: string;
  incomingText: string;
  existingId: string;
  existingText: string;
  score: number;
}

export async function getTopicsList() {
  const admin = createAdminClient();
  const { data } = await admin.from("topics").select("id,name,phase,order_index").order("phase").order("order_index");
  return data ?? [];
}

export function flattenQuestions(qs: ImportQuestion[], parentRef?: string): Array<{ q: ImportQuestion; parentRef?: string; path: string; index: number }> {
  const out: Array<{ q: ImportQuestion; parentRef?: string; path: string; index: number }> = [];
  qs.forEach((q, i) => {
    const ref = q.source_question_number != null ? String(q.source_question_number) : q.temp_id != null ? String(q.temp_id) : `${i + 1}`;
    const path = parentRef ? `${parentRef}.${ref}` : ref;
    out.push({ q, parentRef, path, index: i });
    if (Array.isArray(q.subquestions) && q.subquestions.length) {
      out.push(...flattenQuestions(q.subquestions as ImportQuestion[], path));
    }
  });
  return out;
}

export async function findDuplicateCandidates(incoming: ImportQuestion[]): Promise<DuplicateCandidate[]> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("questions").select("id,text,source_question_number").limit(2000);
  const candidates: DuplicateCandidate[] = [];
  const flat = flattenQuestions(incoming);
  for (const { q, path } of flat) {
    const norm = normalizeTextForDedup(q.question_text || "");
    if (!norm) continue;
    for (const ex of existing ?? []) {
      const exText = (ex as any).text || "";
      const score = similarity(q.question_text || "", exText);
      const exNorm = normalizeTextForDedup(exText);
      if (norm && exNorm && (norm === exNorm || score >= 0.9)) {
        candidates.push({
          incomingRef: path,
          incomingText: q.question_text,
          existingId: (ex as any).id,
          existingText: exText,
          score: norm === exNorm ? 1 : score,
        });
      }
    }
  }
  // unique by pair
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const k = `${c.incomingRef}|${c.existingId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 100);
}

export function hashPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function pickKnown(q: ImportQuestion) {
  const known = new Set([
    "id","temp_id","question_text","question_type","marks","topic_ids","topic_names","difficulty","options",
    "proposed_answer","model_answer","reference_solution","test_cases","marking_rubric","explanation",
    "source_document_id","source_year","source_page","source_question_number","provenance","subquestions",
    "group_key","order_index",
  ]);
  const extra: Record<string, any> = {};
  for (const [k, v] of Object.entries(q)) {
    if (!known.has(k)) extra[k] = v;
  }
  return extra;
}

async function insertQuestionTree(
  admin: ReturnType<typeof createAdminClient>,
  q: ImportQuestion,
  ctx: { batchId: string; defaultSourceDocumentId?: string | null; parentId?: string | null; orderIndex: number }
): Promise<string> {
  const marksNum = typeof q.marks === "string" ? Number(q.marks) : q.marks;
  const topicId = Array.isArray(q.topic_ids) && q.topic_ids.length ? q.topic_ids[0] : null;
  const sourceDocumentId = (q.source_document_id as string | null | undefined) ?? ctx.defaultSourceDocumentId ?? null;
  const extra = pickKnown(q);
  const { data, error } = await admin
    .from("questions")
    .insert({
      topic_id: topicId,
      type: q.question_type,
      text: q.question_text,
      marks: marksNum,
      difficulty: toNumberOrNull(q.difficulty) ?? 1,
      source_document_id: sourceDocumentId,
      source_page: toNumberOrNull(q.source_page),
      source_year: toNumberOrNull(q.source_year),
      status: "pending", // legacy compat, trigger keeps in sync
      question_status: "pending_review",
      answer_status: "unverified",
      parent_question_id: ctx.parentId ?? null,
      order_index: q.order_index ?? ctx.orderIndex,
      group_key: (q.group_key as string | null | undefined) ?? null,
      source_question_number: q.source_question_number != null ? String(q.source_question_number) : null,
      proposed_answer: q.proposed_answer ?? null,
      model_answer: q.model_answer ?? null,
      reference_solution: q.reference_solution ?? null,
      test_cases: q.test_cases ?? null, // structured copy in jsonb; normalized rows below
      marking_rubric: q.marking_rubric ?? null,
      explanation: q.explanation ?? null,
      provenance: q.provenance ?? {},
      import_batch_id: ctx.batchId,
      extra,
      version: 1,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to insert question");

  const questionId = (data as any).id as string;

  if (Array.isArray(q.options) && q.options.length) {
    const rows = q.options.map((o, i) => ({
      question_id: questionId,
      label: String(o.label),
      text: String(o.text),
      is_correct: o.is_correct === true,
      order_index: i,
    }));
    const { error: optErr } = await admin.from("question_options").insert(rows);
    if (optErr) throw new Error(optErr.message);
  }

  if (Array.isArray(q.test_cases) && q.test_cases.length) {
    const rows = q.test_cases.map((t: any, i: number) => ({
      question_id: questionId,
      input: typeof t === "string" ? t : String(t?.input ?? ""),
      expected_output: typeof t === "string" ? "" : String(t?.expected_output ?? t?.output ?? ""),
      is_hidden: t?.is_hidden !== false,
      order_index: i,
    })).filter((r) => r.input !== "" || r.expected_output !== "");
    if (rows.length) {
      const { error: tcErr } = await admin.from("test_cases").insert(rows);
      if (tcErr) throw new Error(tcErr.message);
    }
  }

  if (q.marking_rubric && Array.isArray((q.marking_rubric as any).criteria ?? q.marking_rubric)) {
    const criteriaArr = Array.isArray(q.marking_rubric) ? q.marking_rubric : (q.marking_rubric as any).criteria;
    if (Array.isArray(criteriaArr)) {
      const rows = criteriaArr.map((c: any) => ({
        question_id: questionId,
        criteria: String(c?.criteria ?? c?.text ?? ""),
        max_marks: Number(c?.max_marks ?? c?.marks ?? 0) || 0.5,
        keywords: Array.isArray(c?.keywords) ? c.keywords : [],
      })).filter((r) => r.criteria);
      if (rows.length) {
        const { error: mrErr } = await admin.from("marking_rubrics").insert(rows);
        if (mrErr) throw new Error(mrErr.message);
      }
    }
  }

  // initial version snapshot
  const { data: full } = await admin.from("questions").select("*").eq("id", questionId).single();
  await admin.from("question_versions").insert({ question_id: questionId, version: 1, snapshot: full ?? { id: questionId, ...q } });

  if (Array.isArray(q.subquestions) && q.subquestions.length) {
    for (let i = 0; i < q.subquestions.length; i++) {
      await insertQuestionTree(admin, q.subquestions[i] as ImportQuestion, {
        batchId: ctx.batchId,
        defaultSourceDocumentId: sourceDocumentId,
        parentId: questionId,
        orderIndex: i,
      });
    }
  }

  return questionId;
}

export async function importQuestionsBatch(args: {
  payload: unknown;
  sourceDocumentId?: string | null;
  filename?: string | null;
}) {
  const user = await getAdminUser();
  if (!user) throw new Error("Unauthorized");

  const validation = validateImportPayload(args.payload);
  if (!validation.ok || !validation.data) {
    return { ok: false as const, issues: validation.issues };
  }

  const questions = validation.data.questions as ImportQuestion[];
  const duplicates = await findDuplicateCandidates(questions);
  const admin = createAdminClient();
  const payloadHash = hashPayload(args.payload);

  // create batch record first
  const { data: batch, error: batchErr } = await admin
    .from("question_import_batches")
    .insert({
      source_document_id: args.sourceDocumentId ?? null,
      imported_by: user.id,
      filename: args.filename ?? null,
      raw_payload: args.payload as any,
      payload_hash: payloadHash,
      summary: { total: questions.length, duplicates: duplicates.length },
      status: "imported",
    })
    .select("id")
    .single();
  if (batchErr || !batch) throw new Error(batchErr?.message || "Failed to create import batch");

  const batchId = (batch as any).id as string;
  const insertedIds: string[] = [];

  try {
    for (let i = 0; i < questions.length; i++) {
      const id = await insertQuestionTree(admin, questions[i], {
        batchId,
        defaultSourceDocumentId: args.sourceDocumentId ?? null,
        parentId: null,
        orderIndex: i,
      });
      insertedIds.push(id);
    }
  } catch (e) {
    // best-effort rollback: remove inserted questions/batch
    if (insertedIds.length) {
      await admin.from("questions").delete().in("id", insertedIds);
    }
    await admin.from("question_import_batches").delete().eq("id", batchId);
    throw e;
  }

  return {
    ok: true as const,
    batchId,
    insertedCount: insertedIds.length,
    insertedIds,
    duplicates,
    issues: [],
  };
}

export { validateImportPayload };

