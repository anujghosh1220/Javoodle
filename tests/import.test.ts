import { describe, it, expect } from "vitest";
import { importFileSchema, flattenQuestions, questionImportItemSchema } from "@/lib/question/import-schema";
import { normalizeQuestionText } from "@/lib/question/normalize";

const validMcq = {
  question_text: "What is a loop?",
  question_type: "mcq",
  marks: 1,
  options: [{ label: "A", text: "x" }, { label: "B", text: "y" }],
  correct_option: "A",
};

describe("question import schema", () => {
  it("accepts a valid MCQ", () => {
    const r = importFileSchema.safeParse({ questions: [validMcq] });
    expect(r.success).toBe(true);
  });

  it("rejects invalid question type", () => {
    const r = questionImportItemSchema.safeParse({ ...validMcq, question_type: "essay" });
    expect(r.success).toBe(false);
  });

  it("rejects missing/zero marks", () => {
    expect(questionImportItemSchema.safeParse({ ...validMcq, marks: 0 }).success).toBe(false);
    expect(questionImportItemSchema.safeParse({ ...validMcq, marks: -1 }).success).toBe(false);
  });

  it("rejects empty questions array", () => {
    expect(importFileSchema.safeParse({ questions: [] }).success).toBe(false);
  });

  it("accepts coding question with test cases", () => {
    const r = questionImportItemSchema.safeParse({
      question_text: "Write a program to print hello",
      question_type: "coding", marks: 5,
      reference_solution: "class A {}",
      test_cases: [{ input: "", expected_output: "hello" }],
    });
    expect(r.success).toBe(true);
  });

  it("flattens subquestions", () => {
    const r = importFileSchema.parse({
      questions: [{ ...validMcq, source_question_number: "3", subquestions: [validMcq] }],
    });
    const flat = flattenQuestions(r.questions);
    expect(flat).toHaveLength(2);
    expect(flat[1].source_question_number).toContain("3");
  });
});

describe("duplicate normalization", () => {
  it("normalizes punctuation/case", () => {
    expect(normalizeQuestionText("What is a LOOP?")).toBe(
      normalizeQuestionText("what is a loop")
    );
    expect(normalizeQuestionText("Arrays  (ICSE?)")).toBe("arrays icse");
  });
});
