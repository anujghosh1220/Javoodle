"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractDocument } from "@/lib/extract";

const BUCKET = "question-documents";
const MAX_BYTES = 8 * 1024 * 1024;

const KIND_BY_MIME: Record<string, "pdf" | "docx" | "image"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "image",
  "image/jpeg": "image",
};

function safeName(name: string) {
  return name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "document";
}

export interface UploadResult {
  ok: boolean;
  error?: string;
  uploaded?: number;
}

export async function uploadDocuments(formData: FormData): Promise<UploadResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  const sourceYear = formData.get("source_year")
    ? Number(formData.get("source_year"))
    : null;
  const sourceType = String(formData.get("source_type") ?? "") || null;
  const description = String(formData.get("description") ?? "").slice(0, 500) || null;

  if (files.length === 0) return { ok: false, error: "No files selected." };
  if (files.length > 10) return { ok: false, error: "Max 10 files per upload." };

  let uploaded = 0;
  for (const file of files) {
    const kind = KIND_BY_MIME[file.type];
    if (!kind) {
      return { ok: false, error: `Unsupported file type: ${file.type || file.name}` };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: `${file.name} exceeds 8 MB.` };
    }

    const docId = crypto.randomUUID();
    const path = `${docId}/${safeName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (upErr) return { ok: false, error: `Storage upload failed: ${upErr.message}` };

    const { error: dbErr } = await admin.from("documents").insert({
      id: docId,
      filename: file.name.slice(0, 255),
      mime: file.type,
      storage_path: path,
      kind,
      page_count: null,
      status: "uploaded",
      source_year: sourceYear && sourceYear > 1900 && sourceYear < 2100 ? sourceYear : null,
      source_type: sourceType,
      description,
      extraction_status: "pending",
    });
    if (dbErr) {
      await admin.storage.from(BUCKET).remove([path]);
      return { ok: false, error: `DB insert failed: ${dbErr.message}` };
    }
    uploaded++;
  }
  return { ok: true, uploaded };
}

export async function runExtraction(documentId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: doc, error } = await admin
    .from("documents")
    .select("id, storage_path, kind")
    .eq("id", documentId)
    .single();
  if (error || !doc) return { ok: false as const, error: "Document not found." };

  await admin
    .from("documents")
    .update({ extraction_status: "extracting" })
    .eq("id", documentId);

  const { data: blob, error: dlErr } = await admin.storage
    .from(BUCKET)
    .download(doc.storage_path);
  if (dlErr || !blob) {
    await admin
      .from("documents")
      .update({
        extraction_status: "extraction_failed",
        extraction_meta: { error: dlErr?.message ?? "download failed" },
      })
      .eq("id", documentId);
    return { ok: false as const, error: "Could not download file from storage." };
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const result = await extractDocument(
    buffer,
    doc.kind as "pdf" | "docx" | "image" | "json"
  );

  await admin
    .from("documents")
    .update({
      extracted_text: result.text || null,
      extraction_status: result.status,
      extraction_meta: result.meta,
      extracted_at: new Date().toISOString(),
      page_count:
        typeof result.meta.pageCount === "number" ? result.meta.pageCount : null,
    })
    .eq("id", documentId);

  return { ok: true as const, status: result.status };
}

export async function deleteDocument(documentId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();
  if (doc?.storage_path) {
    await admin.storage.from(BUCKET).remove([doc.storage_path]);
  }
  // questions.source_document_id -> set null on delete (FK behavior)
  const { error } = await admin.from("documents").delete().eq("id", documentId);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

/** Short-lived signed URL for previewing the original document. */
export async function getDocumentUrl(documentId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("documents")
    .select("storage_path, mime")
    .eq("id", documentId)
    .single();
  if (!doc) return null;
  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, 300);
  return data?.signedUrl ?? null;
}
