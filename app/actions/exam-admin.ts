"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { requireAdmin, getAdminUser } from "@/lib/admin/auth";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  QUESTION_DOCUMENT_BUCKET,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  buildStoragePath,
  inferDocumentKind,
  sanitizeFilename,
} from "@/lib/storage/documents";
import { extractDocument } from "@/lib/extraction";
import { parseExamPaperDraft } from "@/lib/exams/extraction/parser";
import {
  examStructureSchema,
  achievableMarks,
  validateMarksAwarded,
  validateOptionalGroup,
  percentageOf,
  computeCountedScore,
  requiredQuestionIds,
  type ExamDraft,
  type ExamSnapshot,
} from "@/lib/exams/shared";

/* eslint-disable @typescript-eslint/no-explicit-any */

function ensureDb() {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    throw new Error("Supabase/service role not configured");
  }
}

export interface AdminActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Exam create / details / paper
// ---------------------------------------------------------------------------

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function num(fd: FormData, key: string, fallback: number): number {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? n : fallback;
}

function dateOrNull(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function uploadPaperFile(
  admin: ReturnType<typeof createAdminClient>,
  file: File,
  userId: string | null
): Promise<{ documentId: string }> {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    throw new Error("Question paper must be a PDF, DOCX or image.");
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error(`File too large (max ${Math.round(MAX_DOCUMENT_SIZE_BYTES / 1024 / 1024)} MB).`);
  }
  if (file.type !== "application/pdf") {
    throw new Error("The question paper must be a PDF.");
  }
  const id = randomUUID();
  const safeName = sanitizeFilename(file.name || "question-paper.pdf");
  const storagePath = buildStoragePath(id, safeName);
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(QUESTION_DOCUMENT_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { error: insErr } = await admin.from("documents").insert({
    id,
    filename: safeName,
    original_filename: file.name,
    mime: file.type,
    storage_path: storagePath,
    storage_bucket: QUESTION_DOCUMENT_BUCKET,
    kind: inferDocumentKind(file.type),
    page_count: null,
    status: "uploaded",
    source_type: "school_paper",
    file_size: file.size,
    uploaded_by: userId,
    metadata: { purpose: "exam_paper" },
  });
  if (insErr) {
    await admin.storage.from(QUESTION_DOCUMENT_BUCKET).remove([storagePath]);
    throw new Error(insErr.message);
  }
  return { documentId: id };
}

export async function createExamAction(formData: FormData): Promise<AdminActionResult> {
  await requireAdmin();
  ensureDb();
  const user = await getAdminUser();
  const admin = createAdminClient();

  const title = str(formData, "title");
  // Simplified creation: only title + total marks are collected. Everything
  // else gets safe internal defaults (duration 120 min, no window, no PDF).
  const duration = num(formData, "duration_minutes", 120) || 120;
  const totalMarks = num(formData, "total_marks", 0);
  if (!title) return { ok: false, error: "Exam name is required." };
  if (totalMarks <= 0) return { ok: false, error: "Total marks must be greater than 0." };

  const file = formData.get("paper");
  let paperDocumentId: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      paperDocumentId = (await uploadPaperFile(admin, file, user?.id ?? null)).documentId;
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Paper upload failed." };
    }
  }

  const { data, error } = await admin
    .from("exams")
    .insert({
      title,
      subject: str(formData, "subject") || "Computer Applications",
      class_name: str(formData, "class_name") || "ICSE Class 10",
      description: str(formData, "description") || null,
      instructions: str(formData, "instructions") || null,
      duration_minutes: Math.round(duration),
      reading_time_minutes: Math.max(0, Math.round(num(formData, "reading_time_minutes", 0))),
      total_marks: totalMarks,
      passing_marks: str(formData, "passing_marks") ? num(formData, "passing_marks", -1) : null,
      opens_at: dateOrNull(formData, "opens_at"),
      closes_at: dateOrNull(formData, "closes_at"),
      release_model_answers: formData.get("release_model_answers") === "on",
      paper_document_id: paperDocumentId,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    if (paperDocumentId) {
      const { data: doc } = await admin
        .from("documents")
        .select("storage_path,storage_bucket")
        .eq("id", paperDocumentId)
        .maybeSingle();
      if (doc) {
        await admin.storage.from((doc as any).storage_bucket).remove([(doc as any).storage_path]);
      }
      await admin.from("documents").delete().eq("id", paperDocumentId);
    }
    return { ok: false, error: error?.message || "Could not create exam." };
  }

  revalidatePath("/admin/exams");
  return { ok: true, id: data.id };
}

export async function updateExamDetailsAction(
  examId: string,
  fields: {
    title: string;
    subject: string;
    class_name: string;
    description: string | null;
    instructions: string | null;
    duration_minutes: number;
    reading_time_minutes: number;
    total_marks: number;
    passing_marks: number | null;
    opens_at: string | null;
    closes_at: string | null;
    release_model_answers: boolean;
  }
): Promise<AdminActionResult> {
  await requireAdmin();
  ensureDb();
  if (!fields.title?.trim()) return { ok: false, error: "Title is required." };
  if (fields.duration_minutes <= 0) return { ok: false, error: "Duration must be > 0." };
  if (fields.total_marks <= 0) return { ok: false, error: "Total marks must be > 0." };
  if (fields.passing_marks !== null && fields.passing_marks > fields.total_marks) {
    return { ok: false, error: "Passing marks cannot exceed total marks." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("exams")
    .update({
      title: fields.title.trim(),
      subject: fields.subject.trim() || "Computer Applications",
      class_name: fields.class_name.trim() || "ICSE Class 10",
      description: fields.description,
      instructions: fields.instructions,
      duration_minutes: Math.round(fields.duration_minutes),
      reading_time_minutes: Math.max(0, Math.round(fields.reading_time_minutes)),
      total_marks: fields.total_marks,
      passing_marks: fields.passing_marks,
      opens_at: fields.opens_at,
      closes_at: fields.closes_at,
      release_model_answers: fields.release_model_answers,
    })
    .eq("id", examId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath("/admin/exams");
  return { ok: true };
}

export async function uploadExamPaperAction(
  examId: string,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();
  ensureDb();
  const user = await getAdminUser();
  const admin = createAdminClient();
  const file = formData.get("paper");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a PDF file first." };
  }

  const { data: exam } = await admin
    .from("exams")
    .select("id,paper_document_id")
    .eq("id", examId)
    .maybeSingle();
  if (!exam) return { ok: false, error: "Exam not found." };

  let documentId: string;
  try {
    documentId = (await uploadPaperFile(admin, file, user?.id ?? null)).documentId;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  // Replace reference; remove the previous paper document + storage object.
  const oldDocId = (exam as any).paper_document_id;
  const { error } = await admin
    .from("exams")
    .update({ paper_document_id: documentId })
    .eq("id", examId);
  if (error) return { ok: false, error: error.message };

  if (oldDocId && oldDocId !== documentId) {
    const { data: oldDoc } = await admin
      .from("documents")
      .select("storage_bucket,storage_path")
      .eq("id", oldDocId)
      .maybeSingle();
    if (oldDoc) {
      await admin.storage
        .from((oldDoc as any).storage_bucket || QUESTION_DOCUMENT_BUCKET)
        .remove([(oldDoc as any).storage_path]);
    }
    await admin.from("documents").delete().eq("id", oldDocId);
  }

  revalidatePath(`/admin/exams/${examId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Question structure
// ---------------------------------------------------------------------------

/**
 * "Prepare Exam from PDF": download the exam's paper, extract text
 * server-side (unpdf — no external AI), and return a structured draft for
 * the admin review UI. Nothing is persisted — the admin confirms the draft
 * and it is saved through saveExamStructureAction.
 */
export async function prepareExamDraftAction(
  examId: string
): Promise<{ ok: boolean; error?: string; draft?: ExamDraft }> {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();

  const { data: exam } = await admin
    .from("exams")
    .select("id,paper_document_id")
    .eq("id", examId)
    .maybeSingle();
  if (!exam) return { ok: false, error: "Exam not found." };
  const docId = (exam as any).paper_document_id;
  if (!docId) return { ok: false, error: "Upload the question paper PDF first." };

  const { data: doc } = await admin
    .from("documents")
    .select("storage_bucket,storage_path,mime,filename,original_filename")
    .eq("id", docId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Paper document not found." };

  const { data: fileData, error: dlErr } = await admin.storage
    .from((doc as any).storage_bucket || QUESTION_DOCUMENT_BUCKET)
    .download((doc as any).storage_path);
  if (dlErr || !fileData) {
    return { ok: false, error: dlErr?.message || "Could not download the PDF." };
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  const mime = (doc as any).mime || "application/pdf";
  const filename = (doc as any).original_filename || (doc as any).filename || "paper.pdf";
  const result = await extractDocument({ mime, filename, bytes });
  if (result.status === "extraction_failed" || result.pages.length === 0) {
    return {
      ok: false,
      error: result.error || "No text could be extracted from this PDF (it may be scanned).",
    };
  }

  const draft = parseExamPaperDraft(result.pages.map((p) => p.text));
  draft.warnings = [...new Set([...draft.warnings, ...result.warnings])];
  if (result.needsManualReview) {
    draft.warnings.push("PDF extraction flagged pages needing manual review — check the paper carefully.");
  }
  return { ok: true, draft };
}

export async function saveExamStructureAction(
  examId: string,
  structureJson: string
): Promise<AdminActionResult> {
  await requireAdmin();
  ensureDb();

  let parsed: unknown;
  try {
    parsed = JSON.parse(structureJson);
  } catch {
    return { ok: false, error: "Invalid structure payload." };
  }
  const result = examStructureSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? "Invalid question structure.",
    };
  }
  const structure = result.data;

  // Every question must reference a declared section; optional groups must
  // be declared and their member counts must satisfy pick_count.
  const sectionKeys = new Set(structure.sections.map((s) => s.key));
  if (structure.questions.some((q) => !sectionKeys.has(q.section_key))) {
    return { ok: false, error: "A question references an unknown section." };
  }
  const groupKeys = new Set(structure.optional_groups.map((g) => g.key));
  if (structure.questions.some((q) => q.optional_group_key && !groupKeys.has(q.optional_group_key))) {
    return { ok: false, error: "A question references an unknown optional group." };
  }
  for (const g of structure.optional_groups) {
    const memberMarks = structure.questions
      .filter((q) => q.optional_group_key === g.key)
      .map((q) => q.marks);
    const gErr = validateOptionalGroup(g, memberMarks);
    if (gErr) return { ok: false, error: `${g.title}: ${gErr}` };
  }
  const seenNumbers = new Set<string>();
  for (const q of structure.questions) {
    if (seenNumbers.has(q.question_number)) {
      return { ok: false, error: `Duplicate question number "${q.question_number}".` };
    }
    seenNumbers.add(q.question_number);
    if (q.question_type === "mcq" && q.options.length < 2) {
      return { ok: false, error: `MCQ "${q.question_number}" needs at least two options.` };
    }
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("exam_attempts")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "This exam already has student attempts. Its question structure is frozen to protect those attempts — create a new exam instead.",
    };
  }

  // Replace questions, groups, then sections (order matters for FK).
  const { error: delQ } = await admin
    .from("exam_paper_questions")
    .delete()
    .eq("exam_id", examId);
  if (delQ) return { ok: false, error: delQ.message };
  const { error: delG } = await admin
    .from("exam_optional_groups")
    .delete()
    .eq("exam_id", examId);
  if (delG) return { ok: false, error: delG.message };
  const { error: delS } = await admin
    .from("exam_sections")
    .delete()
    .eq("exam_id", examId);
  if (delS) return { ok: false, error: delS.message };

  const keyToId = new Map<string, string>();
  for (const s of [...structure.sections].sort((a, b) => a.order_index - b.order_index)) {
    const { data, error } = await admin
      .from("exam_sections")
      .insert({ exam_id: examId, title: s.title, order_index: s.order_index, marks: 0 })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message || "Could not save section." };
    keyToId.set(s.key, data.id);
  }

  const groupKeyToId = new Map<string, string>();
  for (const g of [...structure.optional_groups].sort((a, b) => a.order_index - b.order_index)) {
    const { data, error } = await admin
      .from("exam_optional_groups")
      .insert({
        exam_id: examId,
        title: g.title,
        pick_count: g.pick_count,
        max_counted_marks: g.max_counted_marks,
        order_index: g.order_index,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message || "Could not save optional group." };
    groupKeyToId.set(g.key, data.id);
  }

  for (const [i, q] of structure.questions.entries()) {
    const { error } = await admin.from("exam_paper_questions").insert({
      exam_id: examId,
      section_id: keyToId.get(q.section_key) ?? null,
      optional_group_id: q.optional_group_key ? groupKeyToId.get(q.optional_group_key) ?? null : null,
      question_number: q.question_number,
      prompt: q.prompt,
      question_type: q.question_type,
      marks: q.marks,
      options: q.question_type === "mcq" ? q.options : [],
      model_answer: q.model_answer?.trim() ? q.model_answer.trim() : null,
      order_index: i,
    });
    if (error) return { ok: false, error: error.message };
  }

  // Refresh section marks = sum of question marks.
  const { data: qs } = await admin
    .from("exam_paper_questions")
    .select("section_id,marks")
    .eq("exam_id", examId);
  const sums = new Map<string, number>();
  for (const q of qs ?? []) {
    if (q.section_id) sums.set(q.section_id, (sums.get(q.section_id) ?? 0) + Number(q.marks));
  }
  for (const [sid, marks] of sums) {
    await admin.from("exam_sections").update({ marks }).eq("id", sid);
  }

  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath("/admin/exams");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export async function setExamStatusAction(
  examId: string,
  action: "publish" | "unpublish" | "archive"
): Promise<AdminActionResult> {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();

  const { data: exam } = await admin.from("exams").select("*").eq("id", examId).maybeSingle();
  if (!exam) return { ok: false, error: "Exam not found." };
  const e = exam as any;

  let status: string;
  if (action === "publish") {
    const [{ data: qs }, { data: groups }, { count: attempts }] = await Promise.all([
      admin.from("exam_paper_questions").select("marks,optional_group_id").eq("exam_id", examId),
      admin.from("exam_optional_groups").select("id,pick_count,max_counted_marks").eq("exam_id", examId),
      admin.from("exam_attempts").select("id", { count: "exact", head: true }).eq("exam_id", examId),
    ]);
    if (!qs || qs.length === 0) {
      return { ok: false, error: "Add at least one question before publishing." };
    }
    // Achievable = compulsory marks + capped optional-group marks. With no
    // optional groups this equals the plain question-marks sum.
    const achievable = achievableMarks(
      (qs ?? []).map((q: any) => ({ marks: Number(q.marks), optional_group_id: q.optional_group_id })),
      (groups ?? []).map((g: any) => ({
        id: g.id,
        pick_count: g.pick_count,
        max_counted_marks: Number(g.max_counted_marks),
      }))
    );
    if (Math.abs(achievable - Number(e.total_marks)) > 0.001) {
      return {
        ok: false,
        error: `Achievable marks add up to ${achievable}, but total marks is ${e.total_marks}. Make them match before publishing.`,
      };
    }
    void attempts;
    status = "published";
  } else if (action === "unpublish") {
    status = "draft";
  } else {
    status = "archived";
  }

  const { error } = await admin.from("exams").update({ status }).eq("id", examId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/exams");
  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath("/exams");
  return { ok: true };
}

export async function deleteExamAction(examId: string): Promise<AdminActionResult> {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();
  const { data: exam } = await admin
    .from("exams")
    .select("id,status,paper_document_id")
    .eq("id", examId)
    .maybeSingle();
  if (!exam) return { ok: false, error: "Exam not found." };

  const { count } = await admin
    .from("exam_attempts")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Cannot delete an exam that has student attempts. Archive it instead." };
  }

  if ((exam as any).paper_document_id) {
    const { data: doc } = await admin
      .from("documents")
      .select("storage_bucket,storage_path")
      .eq("id", (exam as any).paper_document_id)
      .maybeSingle();
    if (doc) {
      await admin.storage
        .from((doc as any).storage_bucket || QUESTION_DOCUMENT_BUCKET)
        .remove([(doc as any).storage_path]);
      await admin.from("documents").delete().eq("id", (doc as any).id ?? (exam as any).paper_document_id);
    }
  }

  const { error } = await admin.from("exams").delete().eq("id", examId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/exams");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Evaluation & results
// ---------------------------------------------------------------------------

/** Fetch the student's optional-question selections for an attempt. */
async function getAttemptSelections(
  admin: ReturnType<typeof createAdminClient>,
  attemptId: string
): Promise<Set<string>> {
  const { data } = await admin
    .from("exam_attempt_question_selections")
    .select("paper_question_id")
    .eq("attempt_id", attemptId);
  return new Set((data ?? []).map((r: any) => r.paper_question_id));
}

/** Recompute totals + lifecycle status after an evaluation write. */
async function refreshAttemptEvaluation(admin: ReturnType<typeof createAdminClient>, attemptId: string) {
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id,status,exam_snapshot,total_marks_snapshot,passing_marks_snapshot,published_at,evaluated_at")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return;
  const a = attempt as any;

  const { data: evals } = await admin
    .from("exam_evaluations")
    .select("paper_question_id,marks_awarded")
    .eq("attempt_id", attemptId);
  const selections = await getAttemptSelections(admin, attemptId);

  const snapshot = a.exam_snapshot as ExamSnapshot;
  const required = requiredQuestionIds(snapshot, selections);
  const evaluatedIds = new Set((evals ?? []).map((e: any) => e.paper_question_id));
  const allEvaluated =
    required.size > 0 && [...required].every((id) => evaluatedIds.has(id));

  // Counted score respects optional-group caps; unselected optional
  // questions can never inflate the total.
  const { totalScore } = computeCountedScore(
    (evals ?? []).map((e: any) => ({
      paper_question_id: e.paper_question_id,
      marks_awarded: Number(e.marks_awarded),
    })),
    snapshot,
    selections
  );
  const totalMarks = a.total_marks_snapshot === null ? null : Number(a.total_marks_snapshot);
  const percentage = totalMarks ? percentageOf(totalScore, totalMarks) : null;

  let status = a.status as string;
  const now = new Date().toISOString();
  if (status === "submitted") status = "under_evaluation";
  if (status === "under_evaluation" && allEvaluated) {
    status = "evaluation_completed";
  }
  // evaluation_completed stays editable; result_published stays published.

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

export async function saveEvaluationAction(
  attemptId: string,
  paperQuestionId: string,
  marks: number,
  feedback: string | null
): Promise<AdminActionResult> {
  await requireAdmin();
  ensureDb();
  const user = await getAdminUser();
  if (!Number.isFinite(marks)) return { ok: false, error: "Marks must be a number." };

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id,status,exam_snapshot")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return { ok: false, error: "Attempt not found." };
  if (attempt.status === "in_progress") {
    return { ok: false, error: "This attempt has not been submitted yet." };
  }

  const snapshot = (attempt as any).exam_snapshot as ExamSnapshot;
  const q = snapshot?.questions?.find((x) => x.id === paperQuestionId);
  if (!q) return { ok: false, error: "Unknown question for this attempt." };

  // Optional questions the student did not select cannot be awarded marks.
  if (q.optional_group_id) {
    const selections = await getAttemptSelections(admin, attemptId);
    const hasGroups = (snapshot?.optional_groups ?? []).length > 0;
    if (hasGroups && selections.size > 0 && !selections.has(paperQuestionId)) {
      return { ok: false, error: "This optional question was not selected by the student." };
    }
  }

  const markErr = validateMarksAwarded(marks, Number(q.marks));
  if (markErr) return { ok: false, error: markErr };

  const { error } = await admin.from("exam_evaluations").upsert(
    {
      attempt_id: attemptId,
      paper_question_id: paperQuestionId,
      marks_awarded: marks,
      feedback: feedback?.trim() ? feedback.trim().slice(0, 5000) : null,
      evaluated_by: user?.id ?? null,
      evaluated_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id,paper_question_id" }
  );
  if (error) return { ok: false, error: error.message };

  await refreshAttemptEvaluation(admin, attemptId);
  revalidatePath(`/admin/exams/submissions/${attemptId}`);
  revalidatePath("/admin/exams/submissions");
  return { ok: true };
}

export async function publishResultAction(attemptId: string): Promise<AdminActionResult> {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id,status,exam_snapshot,total_marks_snapshot")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return { ok: false, error: "Attempt not found." };
  const a = attempt as any;
  if (a.status !== "evaluation_completed" && a.status !== "result_published") {
    return { ok: false, error: "Evaluation must be completed before publishing." };
  }

  // Defensive: totals must come from question-level marks only, capped by
  // optional-group rules, and every *required* question must be evaluated.
  const { data: evals } = await admin
    .from("exam_evaluations")
    .select("paper_question_id,marks_awarded")
    .eq("attempt_id", attemptId);
  const snapshot = a.exam_snapshot as ExamSnapshot;
  const selections = await getAttemptSelections(admin, attemptId);
  const required = requiredQuestionIds(snapshot, selections);
  const evaluatedIds = new Set((evals ?? []).map((e: any) => e.paper_question_id));
  if (![...required].every((id) => evaluatedIds.has(id))) {
    return { ok: false, error: "Not every required question has been evaluated yet." };
  }
  const { totalScore } = computeCountedScore(
    (evals ?? []).map((e: any) => ({
      paper_question_id: e.paper_question_id,
      marks_awarded: Number(e.marks_awarded),
    })),
    snapshot,
    selections
  );
  const totalMarks = a.total_marks_snapshot === null ? 0 : Number(a.total_marks_snapshot);
  if (totalScore > totalMarks + 1e-9) {
    return { ok: false, error: "Awarded marks exceed the exam total — fix the evaluations first." };
  }

  const { error } = await admin
    .from("exam_attempts")
    .update({
      status: "result_published",
      total_score: totalScore,
      percentage: percentageOf(totalScore, totalMarks),
      published_at: new Date().toISOString(),
    })
    .eq("id", attemptId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/exams/submissions/${attemptId}`);
  revalidatePath("/admin/exams/submissions");
  revalidatePath("/exams");
  return { ok: true };
}
