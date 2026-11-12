
export type ExtractionStatus =
  | "uploaded"
  | "extracting"
  | "extracted"
  | "extraction_failed"
  | "needs_manual_review";

export interface ExtractionPage {
  pageNumber: number;
  text: string;
  warnings?: string[];
}

export interface ExtractionResult {
  status: ExtractionStatus;
  extractor: "unpdf" | "mammoth" | "ocr" | "manual" | "none";
  text: string;
  pageCount?: number | null;
  pages: ExtractionPage[];
  structured: Record<string, unknown>;
  warnings: string[];
  needsManualReview: boolean;
  error?: string;
}

export interface ExtractionInput {
  mime: string;
  filename: string;
  bytes: Uint8Array;
}

export interface DocumentExtractor {
  canHandle(input: ExtractionInput): boolean;
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}
