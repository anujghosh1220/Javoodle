import { describe, it, expect } from "vitest";
import { evaluatePracticeAnswer, acceptedAnswers, normalizeAnswer } from "@/lib/practice/evaluate";
import type { PracticeQuestionRow, PracticeOptionRow } from "@/lib/practice/evaluate";
import type { PracticeType } from "@/lib/practice/shared";

const base: PracticeQuestionRow = {
  id: "q1", type: "mcq", text: "t", marks: 2, version: 1,
  correct_answer_text: null, explanation: "because", marking_rubric: null,
};

const opts: PracticeOptionRow[] = [
  { id: "o1", question_id: "q1", is_correct: true },
  { id: "o2", question_id: "q1", is_correct: false },
];

function evalQ(type: PracticeType, payload: unknown, q: Partial<PracticeQuestionRow> = {}, options = opts) {
  return evaluatePracticeAnswer({
    question: { ...base, type, ...q },
    options,
    type,
    payload,
  });
}

describe("acceptedAnswers", () => {
  it("parses JSON arrays and plain strings", () => {
    expect(acceptedAnswers("[\"int\",\"Integer\"]")).toEqual(["int", "integer"]);
    expect(acceptedAnswers("double")).toEqual(["double"]);
    expect(acceptedAnswers(null)).toEqual([]);
  });
});

describe("normalizeAnswer", () => {
  it("lowercases, trims and strips trailing punctuation", () => {
    expect(normalizeAnswer("  Hello, World.  ")).toBe("hello, world");
    expect(normalizeAnswer("TRUE!")).toBe("true");
  });
});

describe("evaluatePracticeAnswer", () => {
  it("mcq: correct option earns full marks", () => {
    const r = evalQ("mcq", { optionId: "o1" });
    expect(r.correct).toBe(true);
    expect(r.marksAwarded).toBe(2);
  });
  it("mcq: wrong option earns zero", () => {
    const r = evalQ("mcq", { optionId: "o2" });
    expect(r.correct).toBe(false);
    expect(r.marksAwarded).toBe(0);
  });
  it("mcq: unknown option id is wrong, not a crash", () => {
    const r = evalQ("mcq", { optionId: "nope" });
    expect(r.correct).toBe(false);
  });
  it("fill_blank: accepted answer matches case/space-insensitively", () => {
    const r = evalQ("fill_blank", { text: "  INT " }, { correct_answer_text: "[\"int\",\"integer\"]" });
    expect(r.correct).toBe(true);
  });
  it("output_prediction: exact normalized match required", () => {
    const r = evalQ("output_prediction", { text: "5 6" }, { correct_answer_text: "5 6" });
    expect(r.correct).toBe(true);
    const bad = evalQ("output_prediction", { text: "5  6 " }, { correct_answer_text: "5 6" });
    expect(bad.correct).toBe(true); // whitespace collapsed
    const wrong = evalQ("output_prediction", { text: "6 5" }, { correct_answer_text: "5 6" });
    expect(wrong.correct).toBe(false);
  });
  it("theory: empty answer earns nothing", () => {
    const r = evalQ("theory", { text: "   " }, { correct_answer_text: "A class is a blueprint for objects" });
    expect(r.marksAwarded).toBe(0);
  });
  it("theory: answer covering model keywords scores high", () => {
    const r = evalQ("theory", { text: "A class is a blueprint and an object is an instance created from it" },
      { correct_answer_text: "A class is a blueprint; an object is an instance created from the class", marks: 3 });
    expect(r.marksAwarded).toBeGreaterThan(0);
    expect(r.marksAwarded).toBeLessThanOrEqual(3);
  });
});
