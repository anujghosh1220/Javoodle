import type { DocumentExtractor, ExtractionResult } from "./types";

// OCR for images/scanned docs: best-effort placeholder that flags manual review.
// A local/browser-compatible OCR engine can replace this implementation without
// changing callers. We never invent extracted content.
export const imageExtractor: DocumentExtractor = {
  canHandle(input) {
    return (
      input.mime === "image/png" ||
      input.mime === "image/jpeg" ||
      /\.(png|jpe?g)$/i.test(input.filename)
    );
  },
  async extract(input: import("./types").ExtractionInput): Promise<ExtractionResult> { void input;
    const warnings = [
      "Image/scanned document detected. Automatic OCR is not reliably available in this environment.",
      "Manual transcription or external OCR is required. Original image has been preserved for review.",
      "Do not assume any question content; verify everything against the original document.",
    ];
    return {
      status: "needs_manual_review",
      extractor: "ocr",
      text: "",
      pageCount: 1,
      pages: [{ pageNumber: 1, text: "" }],
      structured: { kind: "image", ocr: "unavailable" },
      warnings,
      needsManualReview: true,
    };
  },
};
