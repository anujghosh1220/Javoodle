export const QUESTION_DOCUMENT_BUCKET = "question-documents";

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export type DocumentSourceType =
  | "previous_year_paper"
  | "specimen_paper"
  | "school_paper"
  | "notes"
  | "marking_scheme"
  | "other";

export const DOCUMENT_SOURCE_TYPE_LABELS: Record<DocumentSourceType, string> = {
  previous_year_paper: "Previous Year Paper",
  specimen_paper: "Specimen Paper",
  school_paper: "School Paper",
  notes: "Notes",
  marking_scheme: "Marking Scheme",
  other: "Other",
};

export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "document";
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "document";
}

export function inferDocumentKind(mime: string): "pdf" | "docx" | "png" | "jpg" | "jpeg" | "image" {
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  return "image";
}

export function buildStoragePath(documentId: string, filename: string): string {
  const safe = sanitizeFilename(filename);
  return `documents/${documentId}/${Date.now()}-${safe}`;
}


