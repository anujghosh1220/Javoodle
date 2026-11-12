/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { validateImportPayload, normalizeTextForDedup, similarity } from "@/lib/questions/schema";

describe("question import validation", () => {
  it("accepts valid mcq payload", () => {
    const res = validateImportPayload({
      questions: [{
        question_text: "What is 2+2?",
        question_type: "mcq",
        marks: 1,
        options: [ { label: "A", text: "3" }, { label: "B", text: "4", is_correct: true } ],
      }],
    });
    expect(res.ok).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  it("rejects missing marks", () => {
    const res = validateImportPayload({ questions: [{ question_text: "Q", question_type: "theory" } as any] });
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.path.includes("marks"))).toBe(true);
  });

  it("rejects invalid question type", () => {
    const res = validateImportPayload({ questions: [{ question_text: "Q", question_type: "essay", marks: 2 } as any] });
    expect(res.ok).toBe(false);
  });

  it("rejects invalid MCQ options (no correct)", () => {
    const res = validateImportPayload({ questions: [{ question_text: "Q", question_type: "mcq", marks: 1, options: [{label:"A",text:"x"},{label:"B",text:"y"}] } as any] });
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.message.toLowerCase().includes("correct"))).toBe(true);
  });
});

describe("duplicate detection helpers", () => {
  it("normalizes and detects high similarity", () => {
    const a = "Explain the use of `final` keyword in Java.";
    const b = "Explain the use of final keyword in Java";
    expect(normalizeTextForDedup(a)).toBe(normalizeTextForDedup(b));
    expect(similarity(a,b)).toBeGreaterThan(0.9);
  });
});

describe("question schema coverage", () => {
  it("accepts all supported question types", () => {
    const types = ["mcq","fill_blank","true_false","output_prediction","find_error","theory","coding"] as const;
    for (const t of types) {
      const q: any = { question_text: "Q", question_type: t, marks: 2 };
      if (t === "mcq") q.options = [{label:"A",text:"x",is_correct:true},{label:"B",text:"y"}];
      const res = validateImportPayload({ questions: [q] });
      expect(res.ok, t).toBe(true);
    }
  });

  it("reports exact question/field for invalid nested subquestion", () => {
    const res = validateImportPayload({ questions: [{
      question_text: "Group", question_type: "theory", marks: 5,
      subquestions: [{ question_text: "Part", question_type: "mcq", marks: 1, options: [{label:"A",text:"x"}] }]
    }] } as any);
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.path.includes("subquestions") || i.message.toLowerCase().includes("option"))).toBe(true);
  });

  it("preserves unsupported/extra fields in payload parsing", () => {
    const res = validateImportPayload({ questions: [{
      question_text: "Q", question_type: "theory", marks: 2, custom_note: "keep-me", provenance: { ai_generated: true, foo: "bar" }
    }] } as any);
    expect(res.ok).toBe(true);
    expect((res.data as any).questions[0].custom_note).toBe("keep-me");
  });

  it("rejects non-positive marks", () => {
    const res = validateImportPayload({ questions: [{ question_text: "Q", question_type: "theory", marks: 0 }] } as any);
    expect(res.ok).toBe(false);
  });
});
