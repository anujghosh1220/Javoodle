import mammoth from "mammoth";
import type { DocumentExtractor, ExtractionResult } from "./types";

export const docxExtractor: DocumentExtractor = {
  canHandle(input) {
    return (
      input.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      input.filename.toLowerCase().endsWith(".docx")
    );
  },
  async extract(input): Promise<ExtractionResult> {
    const warnings: string[] = [];
    try {
      const buffer = Buffer.from(input.bytes);
      const [textResult, htmlResult] = await Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml({ buffer }),
      ]);
      const text = (textResult.value ?? "").trim();
      for (const m of textResult.messages ?? []) {
        if (m?.message) warnings.push(String(m.message));
      }
      for (const m of htmlResult.messages ?? []) {
        if (m?.message && !warnings.includes(String(m.message))) warnings.push(String(m.message));
      }
      if (!text) warnings.push("No text could be extracted from the DOCX document.");
      warnings.push("Verify tables, diagrams, and code formatting against the original document.");
      const needsManualReview = !text || warnings.length > 1;
      return {
        status: needsManualReview ? "needs_manual_review" : "extracted",
        extractor: "mammoth",
        text,
        pageCount: null,
        pages: text ? [{ pageNumber: 1, text }] : [],
        structured: { html: htmlResult.value ?? "", messages: [...(textResult.messages ?? []), ...(htmlResult.messages ?? [])] },
        warnings,
        needsManualReview,
      };
    } catch (e) {
      return {
        status: "extraction_failed",
        extractor: "mammoth",
        text: "",
        pageCount: null,
        pages: [],
        structured: {},
        warnings,
        needsManualReview: false,
        error: e instanceof Error ? e.message : "DOCX extraction failed",
      };
    }
  },
};
