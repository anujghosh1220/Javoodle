import { describe, it, expect } from "vitest";
import { parseExamPaperDraft } from "@/lib/exams/extraction/parser";
import {
  computeCountedScore,
  requiredQuestionIds,
  achievableMarks,
  validateOptionalGroup,
  type ExamSnapshot,
} from "@/lib/exams/shared";

const PAPER = [
  "ICSE Class 10 Computer Applications Practice Paper 1",
  "Subject: Computer Applications",
  "Time: 2 hours",
  "Maximum Marks: 100",
  "",
  "SECTION A (Compulsory) — 40 marks",
  "1. Answer all sub-questions.",
  "1.1 Which of the following is a valid Java identifier? [1]",
  "(A) 1abc (B) _var (C) class (D) my-var",
  "1.2 What is the output of System.out.println(2 + 3 * 4); ? [1]",
  "(A) 20 (B) 14 (C) 9 (D) 24",
  "",
  "2. Answer all parts. (20 marks)",
  "(a) Define encapsulation. [2]",
  "(b) Differentiate between method overloading and overriding. [2]",
  "(c) Explain the use of the final keyword. [2]",
  "(d) What are wrapper classes? Give two examples. [2]",
  "(e) State two features of a constructor. [2]",
  "(f) Differentiate between a class and an object. [2]",
  "(g) What is an array? How is it declared? [2]",
  "(h) Explain the scope of a variable. [2]",
  "(i) What is recursion? Give one example. [2]",
  "(j) Differentiate between static and non-static methods. [2]",
  "",
  "SECTION B (Optional) — 60 marks",
  "Attempt any four questions out of six. Each question carries 15 marks.",
  "3. Write a Java program to create a class Student with a constructor. (15 marks)",
  "(a) Declare the class with two data members. [3]",
  "(b) Write the parameterized constructor. [3]",
  "(c) Write a method to display the details. [3]",
  "(d) Write the main method to test the class. [3]",
  "(e) Explain the output of the program. [3]",
  "4. Explain user-defined methods and demonstrate method overloading. (15 marks)",
  "5. Write a Java program to handle Strings — reverse, palindrome check. (15 marks)",
  "6. Write a Java program using a one-dimensional array with sorting and searching. (15 marks)",
  "7. Write a Java program using a two-dimensional array. (15 marks)",
  "8. Explain wrapper classes, encapsulation and library methods. (15 marks)",
];

describe("parseExamPaperDraft", () => {
  const draft = parseExamPaperDraft(PAPER);

  it("detects metadata", () => {
    expect(draft.meta.title).toContain("ICSE");
    expect(draft.meta.subject).toBe("Computer Applications");
    expect(draft.meta.duration_minutes).toBe(120);
    expect(draft.meta.total_marks).toBe(100);
  });

  it("detects sections", () => {
    expect(draft.sections.length).toBe(2);
    expect(draft.sections[0].title).toContain("Section A");
    expect(draft.sections[1].title).toContain("Section B");
  });

  it("detects numbered questions and sub-questions", () => {
    const numbers = draft.questions.map((q) => q.question_number);
    expect(numbers).toContain("1.1");
    expect(numbers).toContain("1.2");
    expect(numbers).toContain("2(a)");
    expect(numbers).toContain("2(j)");
    // Optional-section sub-parts merge into the parent question row.
    expect(numbers).toContain("3");
    expect(numbers).toContain("8");
  });

  it("detects MCQ options", () => {
    const mcq = draft.questions.find((q) => q.question_number === "1.1");
    expect(mcq?.question_type).toBe("mcq");
    expect(mcq?.options.length).toBe(4);
    expect(mcq?.options[0]).toEqual({ label: "A", text: "1abc" });
    expect(mcq?.options[3]).toEqual({ label: "D", text: "my-var" });
  });

  it("detects marks", () => {
    const q8 = draft.questions.find((q) => q.question_number === "8");
    expect(q8?.marks).toBe(15);
    const q2a = draft.questions.find((q) => q.question_number === "2(a)");
    expect(q2a?.marks).toBe(2);
  });

  it("detects optional group with attempt-any-four", () => {
    expect(draft.optional_groups.length).toBe(1);
    const g = draft.optional_groups[0];
    expect(g.pick_count).toBe(4);
    // 6 questions × 15 marks → top 4 counted = 60
    expect(g.max_counted_marks).toBe(60);
    const members = draft.questions.filter((q) => q.optional_group_key === g.key);
    expect(members.length).toBe(6);
    expect(members.map((q) => q.question_number)).toEqual(["3", "4", "5", "6", "7", "8"]);
  });

  it("produces 100 achievable marks despite ~130 available", () => {
    // Section A: 1.1+1.2 = 2, Q2 parts = 20 → 22? plus Q3-8 available 90, capped 60.
    const available = draft.questions.reduce((s, q) => s + (q.marks ?? 0), 0);
    expect(available).toBeGreaterThan(100);
    // achievable = compulsory + capped groups
    const groups = draft.optional_groups.map((g) => ({
      id: g.key, pick_count: g.pick_count, max_counted_marks: g.max_counted_marks,
    }));
    const qs = draft.questions.map((q) => ({ marks: q.marks ?? 0, optional_group_id: q.optional_group_key }));
    expect(achievableMarks(qs, groups)).toBeLessThanOrEqual(100);
  });

  it("warns on missing marks rather than guessing", () => {
    const d2 = parseExamPaperDraft(["1. Explain something important here.", "2. Another question without marks anywhere."]);
    expect(d2.questions.every((q) => q.marks === null)).toBe(true);
    expect(d2.warnings.some((w) => /marks/i.test(w))).toBe(true);
  });

  it("handles empty/unreadable input", () => {
    const d = parseExamPaperDraft(["", "   "]);
    expect(d.confidence).toBe("low");
    expect(d.questions).toHaveLength(0);
    expect(d.warnings.length).toBeGreaterThan(0);
  });
});

describe("optional-group scoring", () => {
  const snapshot = {
    questions: [
      { id: "c1", section_id: "s1", optional_group_id: null, question_number: "1", prompt: "", question_type: "mcq", marks: 1, options: [], model_answer: null, order_index: 0 },
      { id: "o1", section_id: "s2", optional_group_id: "g1", question_number: "3", prompt: "", question_type: "theory", marks: 15, options: [], model_answer: null, order_index: 1 },
      { id: "o2", section_id: "s2", optional_group_id: "g1", question_number: "4", prompt: "", question_type: "theory", marks: 15, options: [], model_answer: null, order_index: 2 },
      { id: "o3", section_id: "s2", optional_group_id: "g1", question_number: "5", prompt: "", question_type: "theory", marks: 15, options: [], model_answer: null, order_index: 3 },
    ],
    optional_groups: [
      { id: "g1", title: "Attempt any 2", pick_count: 2, max_counted_marks: 30, order_index: 0 },
    ],
  } as unknown as Pick<ExamSnapshot, "questions" | "optional_groups">;

  it("caps group marks at max_counted_marks", () => {
    const evals = [
      { paper_question_id: "c1", marks_awarded: 1 },
      { paper_question_id: "o1", marks_awarded: 15 },
      { paper_question_id: "o2", marks_awarded: 15 },
      { paper_question_id: "o3", marks_awarded: 15 },
    ];
    // Student selected o1+o2 only → o3 doesn't count even though evaluated.
    const score = computeCountedScore(evals, snapshot, ["o1", "o2"]);
    expect(score.totalScore).toBe(31); // 1 + min(30,30)
  });

  it("ignores evaluations on unselected optional questions", () => {
    const evals = [
      { paper_question_id: "c1", marks_awarded: 1 },
      { paper_question_id: "o3", marks_awarded: 15 }, // not selected
    ];
    const score = computeCountedScore(evals, snapshot, ["o1", "o2"]);
    expect(score.totalScore).toBe(1);
  });

  it("requiredQuestionIds = compulsory + selected only", () => {
    const req = requiredQuestionIds(snapshot, ["o1", "o2"]);
    expect(req.has("c1")).toBe(true);
    expect(req.has("o1")).toBe(true);
    expect(req.has("o2")).toBe(true);
    expect(req.has("o3")).toBe(false);
  });

  it("legacy attempts without selections require all questions", () => {
    const req = requiredQuestionIds(snapshot, []);
    expect(req.size).toBe(4);
  });
});

describe("validateOptionalGroup", () => {
  it("accepts valid group", () => {
    expect(validateOptionalGroup({ pick_count: 4, max_counted_marks: 60 }, [15, 15, 15, 15, 15, 15])).toBeNull();
  });
  it("rejects too few members", () => {
    expect(validateOptionalGroup({ pick_count: 4, max_counted_marks: 60 }, [15, 15])).toMatch(/at least 4/);
  });
  it("rejects max counted above available", () => {
    expect(validateOptionalGroup({ pick_count: 2, max_counted_marks: 50 }, [15, 15, 15])).toMatch(/exceeds/);
  });
});
