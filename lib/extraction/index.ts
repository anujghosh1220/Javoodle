import { pdfExtractor } from "./pdf";
import { docxExtractor } from "./docx";
import { imageExtractor } from "./image";
import type { DocumentExtractor, ExtractionInput, ExtractionResult } from "./types";

const extractors: DocumentExtractor[] = [pdfExtractor, docxExtractor, imageExtractor];

export async function extractDocument(input: ExtractionInput): Promise<ExtractionResult> {
  const extractor = extractors.find((e) => e.canHandle(input));
  if (!extractor) {
    return {
      status: "extraction_failed",
      extractor: "none",
      text: "",
      pageCount: null,
      pages: [],
      structured: {},
      warnings: [],
      needsManualReview: false,
      error: `Unsupported document type for extraction: ${input.mime || input.filename}`,
    };
  }
  return extractor.extract(input);
}

export type { ExtractionInput, ExtractionResult } from "./types";
