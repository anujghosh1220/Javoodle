import { extractText, getDocumentProxy } from "unpdf";
import type { DocumentExtractor, ExtractionResult } from "./types";

export const pdfExtractor: DocumentExtractor = {
  canHandle(input) {
    return input.mime === "application/pdf" || input.filename.toLowerCase().endsWith(".pdf");
  },
  async extract(input): Promise<ExtractionResult> {
    const warnings: string[] = [];
    try {
      const pdf = await getDocumentProxy(new Uint8Array(input.bytes));
      const { totalPages, text } = await extractText(pdf, { mergePages: false });
      const pages = (Array.isArray(text) ? text : [String(text ?? "")]).map((t, i) => ({
        pageNumber: i + 1,
        text: String(t ?? "").trim(),
      }));
      const merged = pages.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`).join("\n\n").trim();
      const nonEmpty = pages.filter((p) => p.text.length > 0).length;
      if (nonEmpty === 0) {
        warnings.push("No extractable text found in PDF. Document may be scanned or image-only.");
      }
      if (nonEmpty > 0 && nonEmpty < pages.length) {
        warnings.push("Some PDF pages contain no extractable text; they may include scanned content or diagrams.");
      }
      warnings.push("Tables, diagrams, and complex formatting may not be fully preserved. Verify against the original document.");
      const needsManualReview = nonEmpty === 0 || warnings.length > 1;
      return {
        status: needsManualReview ? "needs_manual_review" : "extracted",
        extractor: "unpdf",
        text: merged,
        pageCount: totalPages ?? pages.length,
        pages,
        structured: { totalPages: totalPages ?? pages.length, pages },
        warnings,
        needsManualReview,
      };
    } catch (e) {
      return {
        status: "extraction_failed",
        extractor: "unpdf",
        text: "",
        pageCount: null,
        pages: [],
        structured: {},
        warnings,
        needsManualReview: false,
        error: e instanceof Error ? e.message : "PDF extraction failed",
      };
    }
  },
};



