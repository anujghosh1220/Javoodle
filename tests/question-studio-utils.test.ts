import { describe, it, expect } from "vitest";
import { sanitizeFilename, inferDocumentKind, buildStoragePath, ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/storage/documents";
import { buildAnalysisPrompt } from "@/lib/questions/prompt";

describe("storage helpers", () => {
  it("sanitizes filenames and strips paths", () => {
    expect(sanitizeFilename("../weird name?.pdf")).not.toContain("..");
    expect(sanitizeFilename("C:\\path\\paper.docx")).toBe("paper.docx");
    expect(sanitizeFilename("")).toBe("document");
  });
  it("infers kinds and enforces allowed types/size", () => {
    expect(inferDocumentKind("application/pdf")).toBe("pdf");
    expect(inferDocumentKind("image/png")).toBe("png");
    expect(ALLOWED_DOCUMENT_MIME_TYPES.has("application/pdf")).toBe(true);
    expect(ALLOWED_DOCUMENT_MIME_TYPES.has("text/plain")).toBe(false);
    expect(MAX_DOCUMENT_SIZE_BYTES).toBe(20 * 1024 * 1024);
  });
  it("builds scoped storage paths", () => {
    const p = buildStoragePath("doc-1", "my file.pdf");
    expect(p.startsWith("documents/doc-1/")).toBe(true);
    expect(p).toContain("my-file.pdf");
  });
});

describe("AI prompt generation", () => {
  it("includes preservation, provenance, and no-invention instructions", () => {
    const prompt = buildAnalysisPrompt({ documentName: "Paper 2024.pdf", sourceYear: 2024, sourceType: "previous_year_paper", extractedText: "Q1 text" });
    expect(prompt).toContain("Preserve original wording");
    expect(prompt).toContain("NEVER invent");
    expect(prompt).toContain("source-derived");
    expect(prompt).toContain("AI-generated");
    expect(prompt).toContain("Paper 2024.pdf");
    expect(prompt).toContain("Q1 text");
    expect(prompt).toContain("mcq");
  });
});
