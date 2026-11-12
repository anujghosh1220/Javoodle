import { describe, it, expect } from "vitest";
import {
  generateSessionToken,
  hashSessionToken,
  isSessionUsable,
  isWellFormedToken,
  SESSION_TTL_MS,
} from "@/lib/student/token";
import { studentNameSchema } from "@/lib/validation/student";

describe("session tokens", () => {
  it("generates unique, well-formed tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(isWellFormedToken(a)).toBe(true);
    expect(isWellFormedToken(b)).toBe(true);
    expect(a.startsWith("jds_")).toBe(true);
  });

  it("rejects malformed tokens", () => {
    expect(isWellFormedToken("not-a-token")).toBe(false);
    expect(isWellFormedToken("jds_short")).toBe(false);
    // Phase-1 style bare UUIDs are rejected
    expect(
      isWellFormedToken("123e4567-e89b-42d3-a456-426614174000")
    ).toBe(false);
  });

  it("hashes deterministically to 64-char hex", () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(hash);
    expect(hashSessionToken(generateSessionToken())).not.toBe(hash);
  });
});

describe("session expiry", () => {
  const now = new Date("2026-11-12T00:00:00Z");

  it("accepts a fresh, unrevoked session", () => {
    expect(
      isSessionUsable(
        { expiresAt: new Date(now.getTime() + SESSION_TTL_MS), revokedAt: null },
        now
      )
    ).toBe(true);
  });

  it("rejects expired sessions", () => {
    expect(
      isSessionUsable(
        { expiresAt: new Date(now.getTime() - 1), revokedAt: null },
        now
      )
    ).toBe(false);
  });

  it("rejects revoked sessions even if unexpired", () => {
    expect(
      isSessionUsable(
        {
          expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
          revokedAt: now,
        },
        now
      )
    ).toBe(false);
  });
});

describe("student name validation", () => {
  it("accepts normal names", () => {
    expect(studentNameSchema.safeParse("Ananya").success).toBe(true);
    expect(studentNameSchema.safeParse("Mary Jane O'Connor-Smith").success).toBe(true);
  });

  it("rejects empty, numeric and symbol names", () => {
    expect(studentNameSchema.safeParse("").success).toBe(false);
    expect(studentNameSchema.safeParse("x").success).toBe(false);
    expect(studentNameSchema.safeParse("student123").success).toBe(false);
    expect(studentNameSchema.safeParse("<script>").success).toBe(false);
    expect(studentNameSchema.safeParse("a".repeat(41)).success).toBe(false);
  });
});
