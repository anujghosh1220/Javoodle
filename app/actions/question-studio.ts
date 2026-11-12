/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { requireAdmin, getAdminUser } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { extractDocument } from "@/lib/extraction";
import {
  QUESTION_DOCUMENT_BUCKET,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  buildStoragePath,
  inferDocumentKind,
  sanitizeFilename,
  type DocumentSourceType,
} from "@/lib/storage/documents";
import { buildAnalysisPrompt } from "@/lib/questions/prompt";
import { importQuestionsBatch, findDuplicateCandidates } from "@/lib/questions/service";
import { validateImportPayload } from "@/lib/questions/schema";

function ensureDb() {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    throw new Error("Supabase/service role not configured");
  }
}

export async function uploadDocumentsAction(formData: FormData) {
  await requireAdmin();
  ensureDb();
  const user = await getAdminUser();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  const sourceYearRaw = String(formData.get("source_year") ?? "").trim();
  const sourceType = (String(formData.get("source_type") ?? "other") || "other") as DocumentSourceType;
  const description = String(formData.get("description") ?? "").trim() || null;
  const sourceYear = sourceYearRaw ? Number(sourceYearRaw) : null;

  if (!files.length) return { ok: false as const, error: "No files selected" };

  const admin = createAdminClient();
  const results: Array<{ id?: string; name: string; error?: string }> = [];

  for (const file of files) {
    try {
      if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
        throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
      }
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        throw new Error(`File too large (max ${Math.round(MAX_DOCUMENT_SIZE_BYTES / 1024 / 1024)} MB)`);
      }
      const id = randomUUID();
      const safeName = sanitizeFilename(file.name || "document");
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
        source_year: sourceYear,
        source_type: sourceType,
        description,
        file_size: file.size,
        uploaded_by: user?.id ?? null,
        metadata: {},
      });
      if (insErr) {
        await admin.storage.from(QUESTION_DOCUMENT_BUCKET).remove([storagePath]);
        throw new Error(insErr.message);
      }
      results.push({ id, name: file.name });
    } catch (e) {
      results.push({ name: file.name, error: e instanceof Error ? e.message : "Upload failed" });
    }
  }

  revalidatePath("/admin/documents");
  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/upload");
  return { ok: true as const, results };
}

export async function extractDocumentAction(documentId: string) {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();
  const { data: doc, error } = await admin.from("documents").select("*").eq("id", documentId).single();
  if (error || !doc) return { ok: false as const, error: "Document not found" };

  await admin.from("documents").update({ status: "extracting", extraction_error: null }).eq("id", documentId);

  // determine next attempt
  const { data: prev } = await admin
    .from("document_extractions")
    .select("attempt")
    .eq("document_id", documentId)
    .order("attempt", { ascending: false })
    .limit(1);
  const attempt = ((prev?.[0] as any)?.attempt ?? 0) + 1;

  const { data: fileData, error: dlErr } = await admin.storage
    .from((doc as any).storage_bucket || QUESTION_DOCUMENT_BUCKET)
    .download((doc as any).storage_path);
  if (dlErr || !fileData) {
    await admin.from("documents").update({ status: "extraction_failed", extraction_error: dlErr?.message || "Download failed" }).eq("id", documentId);
    return { ok: false as const, error: dlErr?.message || "Could not download document" };
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  const result = await extractDocument({ mime: (doc as any).mime, filename: (doc as any).filename, bytes });
  const status = result.status === "extracted" ? "extracted" : result.status === "needs_manual_review" ? "needs_manual_review" : "extraction_failed";

  const user = await getAdminUser();
  await admin.from("document_extractions").insert({
    document_id: documentId,
    attempt,
    status: status === "extracted" ? "extracted" : status === "needs_manual_review" ? "needs_manual_review" : "extraction_failed",
    extractor: result.extractor,
    extracted_text: result.text,
    structured: result.structured ?? {},
    page_count: result.pageCount ?? null,
    warnings: result.warnings ?? [],
    needs_manual_review: result.needsManualReview,
    error_message: result.error ?? null,
    created_by: user?.id ?? null,
  });

  await admin.from("documents").update({
    status,
    page_count: result.pageCount ?? (doc as any).page_count,
    extraction_error: result.error ?? null,
    extracted_at: new Date().toISOString(),
  }).eq("id", documentId);

  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents`);
  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/upload");
  revalidatePath("/admin/questions/import");
  return { ok: true as const, status, warnings: result.warnings };
}

export async function updateExtractedTextAction(extractionId: string, text: string) {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();
  const { data: ex } = await admin.from("document_extractions").select("document_id, structured").eq("id", extractionId).single();
  if (!ex) return { ok: false as const, error: "Extraction not found" };
  await admin.from("document_extractions").update({
    extracted_text: text,
    needs_manual_review: false,
    status: "extracted",
    warnings: [],
  }).eq("id", extractionId);
  await admin.from("documents").update({ status: "extracted", extraction_error: null, extracted_at: new Date().toISOString() }).eq("id", (ex as any).document_id);
  revalidatePath("/admin/documents");
  revalidatePath("/admin/questions/import");
  return { ok: true as const };
}

export async function deleteDocumentAction(documentId: string) {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();
  const { data: doc } = await admin.from("documents").select("storage_path,storage_bucket").eq("id", documentId).single();
  if (doc) {
    await admin.storage.from((doc as any).storage_bucket || QUESTION_DOCUMENT_BUCKET).remove([(doc as any).storage_path]);
  }
  await admin.from("documents").delete().eq("id", documentId);
  revalidatePath("/admin/documents");
  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/upload");
  return { ok: true as const };
}

export async function getDocumentSignedUrlAction(documentId: string) {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();
  const { data: doc } = await admin.from("documents").select("storage_path,storage_bucket,mime,original_filename,filename").eq("id", documentId).single();
  if (!doc) return { ok: false as const, error: "Document not found" };
  const { data, error } = await admin.storage
    .from((doc as any).storage_bucket || QUESTION_DOCUMENT_BUCKET)
    .createSignedUrl((doc as any).storage_path, 60 * 10);
  if (error || !data) return { ok: false as const, error: error?.message || "Could not create signed URL" };
  return { ok: true as const, url: data.signedUrl, mime: (doc as any).mime, name: (doc as any).original_filename || (doc as any).filename };
}

export async function getAnalysisPromptAction(documentId: string) {
  await requireAdmin();
  ensureDb();
  const admin = createAdminClient();
  const { data: doc } = await admin.from("documents").select("id,filename,original_filename,source_year,source_type").eq("id", documentId).single();
  if (!doc) return { ok: false as const, error: "Document not found" };
  const { data: ex } = await admin
    .from("document_extractions")
    .select("extracted_text")
    .eq("document_id", documentId)
    .order("attempt", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prompt = buildAnalysisPrompt({
    documentName: (doc as any).original_filename || (doc as any).filename,
    sourceYear: (doc as any).source_year,
    sourceType: (doc as any).source_type,
    extractedText: (ex as any)?.extracted_text ?? "",
  });
  return { ok: true as const, prompt, extractedText: (ex as any)?.extracted_text ?? "" };
}

export async function validateImportAction(payload: unknown) {
  await requireAdmin();
  ensureDb();
  const result = validateImportPayload(payload);
  let duplicates: any[] = [];
  if (result.ok && result.data) {
    duplicates = await findDuplicateCandidates(result.data.questions as any);
  }
  return { ok: result.ok, issues: result.issues, questions: result.data?.questions ?? [], duplicates };
}

export async function importQuestionsAction(args: { payload: unknown; sourceDocumentId?: string | null; filename?: string | null }) {
  await requireAdmin();
  ensureDb();
  const res = await importQuestionsBatch(args);
  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/review");
  revalidatePath("/admin/questions/bank");
  revalidatePath("/admin/questions/import");
  return res;
}
