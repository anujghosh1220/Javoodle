import { describe, expect, it } from "vitest";
import { codingQuestionInputSchema, studentSafeQuestion, sha256Hex, testCaseInputSchema } from "@/lib/coding/shared";

const baseQ = {
  id: "q1", title: "Reverse a number", description: "desc", problem_statement: "stmt",
  input_format: "int", output_format: "int", constraints: "n < 10^9", hints: "use %",
  starter_code: "public class Main {}", marks: 5, difficulty: "easy" as const,
  topic: "Loops", time_recommendation_minutes: 15, status: "published" as const,
  created_at: "2025-01-01",
};

describe("coding question schema", () => {
  it("accepts a valid question", () => {
    const r = codingQuestionInputSchema.safeParse(baseQ);
    expect(r.success).toBe(true);
  });
  it("rejects missing title / bad marks / bad difficulty", () => {
    expect(codingQuestionInputSchema.safeParse({ ...baseQ, title: "" }).success).toBe(false);
    expect(codingQuestionInputSchema.safeParse({ ...baseQ, marks: -1 }).success).toBe(false);
    expect(codingQuestionInputSchema.safeParse({ ...baseQ, difficulty: "insane" }).success).toBe(false);
  });
});

describe("studentSafeQuestion — hidden test case protection", () => {
  const cases = [
    { id: "s1", question_id: "q1", kind: "sample" as const, input_data: "5", expected_output: "5", weight: 1, order_index: 0 },
    { id: "h1", question_id: "q1", kind: "hidden" as const, input_data: "SECRET", expected_output: "TOPSECRET", weight: 2, order_index: 1 },
  ];
  it("returns only sample cases, never hidden", () => {
    const safe = studentSafeQuestion(baseQ, cases as Parameters<typeof studentSafeQuestion>[1]);
    expect(safe.sample_cases).toHaveLength(1);
    expect(safe.sample_cases[0].input_data).toBe("5");
    expect(JSON.stringify(safe)).not.toContain("SECRET");
    expect(JSON.stringify(safe)).not.toContain("TOPSECRET");
  });
  it("does not expose status or internal fields", () => {
    const safe = studentSafeQuestion(baseQ, [] as Parameters<typeof studentSafeQuestion>[1]);
    expect("status" in safe).toBe(false);
    expect("created_at" in safe).toBe(false);
  });
});

describe("test case schema", () => {
  it("validates kind and weight", () => {
    expect(testCaseInputSchema.safeParse({ kind: "hidden", input_data: "1", expected_output: "1", weight: 2 }).success).toBe(true);
    expect(testCaseInputSchema.safeParse({ kind: "bogus", input_data: "1", expected_output: "1" }).success).toBe(false);
    expect(testCaseInputSchema.safeParse({ kind: "sample", input_data: "1", expected_output: "1", weight: -1 }).success).toBe(false);
  });
});

describe("source hash — submit-time version validation", () => {
  it("is deterministic and changes with source", () => {
    const a = sha256Hex("class Main {}");
    expect(a).toBe(sha256Hex("class Main {}"));
    expect(a).not.toBe(sha256Hex("class Main { }"));
    expect(a.length).toBeGreaterThan(8);
  });
});
