/** Normalize for duplicate detection: lowercase, collapse whitespace/punct. */
export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
