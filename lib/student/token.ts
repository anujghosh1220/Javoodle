import { createHash, randomBytes } from "crypto";

/**
 * Student session tokens.
 *
 * The cookie carries the RAW token (`jds_` + 32 random bytes, base64url).
 * The database stores only its SHA-256 hash, so a database leak does not
 * yield usable session credentials.
 */

const TOKEN_PREFIX = "jds_";
export const TOKEN_BYTES = 32;

/** 30-day session lifetime, matching the Phase 1 cookie experience. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function generateSessionToken(): string {
  return TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString("base64url");
}

export function isWellFormedToken(token: string): boolean {
  return (
    token.startsWith(TOKEN_PREFIX) &&
    token.length === TOKEN_PREFIX.length + Math.ceil((TOKEN_BYTES * 4) / 3)
  );
}

/** SHA-256 hex digest — what gets stored in student_sessions.token_hash. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Pure expiry check, kept separate for unit testing. */
export function isSessionUsable(
  session: { expiresAt: Date; revokedAt: Date | null },
  now: Date = new Date()
): boolean {
  if (session.revokedAt) return false;
  return session.expiresAt.getTime() > now.getTime();
}
