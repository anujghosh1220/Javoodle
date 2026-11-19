/**
 * Canonical student-name normalization — used for uniqueness checks and
 * matching. Trim, collapse internal whitespace, compare case-insensitively.
 * The ORIGINAL display formatting is preserved for presentation.
 */
export function normalizeStudentName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Thrown when a normalized name is already registered. */
export class StudentNameTakenError extends Error {
  constructor() {
    super("student name taken");
    this.name = "StudentNameTakenError";
  }
}
