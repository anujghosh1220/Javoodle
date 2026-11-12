import "server-only";

export type ExtractionStatus =
  | "pending"
  | "extracting"
  | "extracted"
  | "extraction_failed"
  | "needs_manual_review";

export interface ExtractionResult {
  status: ExtractionStatus;
  text: string;
  meta: Record<string, unknown>;
}

const MAX_TEXT = 500_000; // ~0.5 MB of text is far beyond any syllabus paper

function finalize(text: string, meta: Record<string, unknown>): ExtractionResult {
  const trimmed = text.slice(0, MAX_TEXT);
  if (!trimmed.trim()) {
    return {
      status: "needs_manual_review",
      text: "",
      meta: { ...meta, reason: "no_text_extracted" },
    };
  }
  return { status: "extracted", text: trimmed, meta };
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // unpdf is serverless-friendly (pdf.js under the hood, no DOM needed).
    const { extractText } = await import("unpdf");
    const result = await extractText(new Uint8Array(buffer), {
      mergePages: false,
    });
    const pages: string[] = Array.isArray(result.text)
      ? result.text
      : [String(result.text ?? "")];
    const text = pages
      .map((p, i) => `\n--- Page ${i + 1} ---\n${p}`)
      .join("\n");
    return finalize(text, {
      pageCount: pages.length,
      engine: "unpdf",
      note: "Scanned/image PDFs produce little text — use needs_manual_review + original file.",
    });
  } catch (err) {
    return {
      status: "extraction_failed",
      text: "",
      meta: { engine: "unpdf", error: String(err).slice(0, 500) },
    };
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return finalize(result.value ?? "", {
      engine: "mammoth",
      messages: (result.messages ?? []).slice(0, 20),
    });
  } catch (err) {
    return {
      status: "extraction_failed",
      text: "",
      meta: { engine: "mammoth", error: String(err).slice(0, 500) },
    };
  }
}

/**
 * Extract text from an uploaded document.
 * Images/scans intentionally return needs_manual_review — we never pretend
 * OCR ran when it didn't. The original file stays available for reference.
 */
export async function extractDocument(
  buffer: Buffer,
  kind: "pdf" | "docx" | "image" | "json"
): Promise<ExtractionResult> {
  switch (kind) {
    case "pdf":
      return extractPdf(buffer);
    case "docx":
      return extractDocx(buffer);
    case "image":
      return {
        status: "needs_manual_review",
        text: "",
        meta: {
          reason: "image_document",
          note: "OCR is not enabled. Transcribe questions manually or convert to PDF/DOCX.",
        },
      };
    case "json":
      return {
        status: "needs_manual_review",
        text: "",
        meta: { reason: "json_document", note: "Import via the JSON importer instead." },
      };
  }
}
