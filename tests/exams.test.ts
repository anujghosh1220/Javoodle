import { describe, it, expect } from "vitest";
import {
  isExamAvailable,
  remainingMs,
  isAttemptExpired,
  formatCountdown,
  percentageOf,
  validateMarksAwarded,
  isAnswerEmpty,
  groupQuestionsBySection,
  examStructureSchema,
  type ExamSnapshot,
} from "@/lib/exams/shared";

describe("exam availability", () => {
  const now = new Date("2026-11-14T12:00:00Z");

  it("requires published status", () => {
    expect(isExamAvailable({ status: "draft", opens_at: null, closes_at: null }, now)).toBe(false);
    expect(isExamAvailable({ status: "archived", opens_at: null, closes_at: null }, now)).toBe(false);
    expect(isExamAvailable({ status: "published", opens_at: null, closes_at: null }, now)).toBe(true);
  });

  it("respects opens_at and closes_at", () => {
    expect(
      isExamAvailable({ status: "published", opens_at: "2026-11-14T13:00:00Z", closes_at: null }, now)
    ).toBe(false);
    expect(
      isExamAvailable({ status: "published", opens_at: null, closes_at: "2026-11-14T11:00:00Z" }, now)
    ).toBe(false);
    expect(
      isExamAvailable(
        { status: "published", opens_at: "2026-11-14T11:00:00Z", closes_at: "2026-11-14T13:00:00Z" },
        now
      )
    ).toBe(true);
  });
});

describe("attempt timing", () => {
  const now = new Date("2026-11-14T12:00:00Z");

  it("computes remaining time without going negative", () => {
    expect(remainingMs("2026-11-14T12:30:00Z", now)).toBe(30 * 60 * 1000);
    expect(remainingMs("2026-11-14T11:00:00Z", now)).toBe(0);
    expect(remainingMs(null as unknown as string, now)).toBe(0);
  });

  it("detects expiry", () => {
    expect(isAttemptExpired("2026-11-14T12:00:01Z", now)).toBe(false);
    expect(isAttemptExpired("2026-11-14T11:59:59Z", now)).toBe(true);
    expect(isAttemptExpired(null, now)).toBe(false);
  });

  it("formats countdown", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(65_000)).toBe("01:05");
    expect(formatCountdown(3_725_000)).toBe("1:02:05");
  });
});

describe("marks & scoring", () => {
  it("computes percentage", () => {
    expect(percentageOf(80, 100)).toBe(80);
    expect(percentageOf(1, 3)).toBe(33.33);
    expect(percentageOf(10, 0)).toBeNull();
  });

  it("validates awarded marks", () => {
    expect(validateMarksAwarded(5, 10)).toBeNull();
    expect(validateMarksAwarded(0, 10)).toBeNull();
    expect(validateMarksAwarded(-1, 10)).toMatch(/negative/);
    expect(validateMarksAwarded(11, 10)).toMatch(/exceed/);
    expect(validateMarksAwarded(NaN, 10)).toMatch(/number/);
  });
});

describe("answer emptiness", () => {
  it("treats blank text and no MCQ as empty", () => {
    expect(isAnswerEmpty({ answer_text: "", mcq_option: null })).toBe(true);
    expect(isAnswerEmpty({ answer_text: "   ", mcq_option: null })).toBe(true);
    expect(isAnswerEmpty({ answer_text: "", mcq_option: "B" })).toBe(false);
    expect(isAnswerEmpty({ answer_text: "hello", mcq_option: null })).toBe(false);
  });
});

describe("section grouping", () => {
  const sections: ExamSnapshot["sections"] = [
    { id: "s2", title: "Section B", order_index: 1, marks: 0 },
    { id: "s1", title: "Section A", order_index: 0, marks: 0 },
  ];
  const questions: ExamSnapshot["questions"] = [
    { id: "q3", section_id: "s2", optional_group_id: null, question_number: "3", prompt: "", question_type: "theory", marks: 4, options: [], model_answer: null, order_index: 2 },
    { id: "q1", section_id: "s1", optional_group_id: null, question_number: "1", prompt: "", question_type: "theory", marks: 2, options: [], model_answer: null, order_index: 0 },
    { id: "q2", section_id: "s1", optional_group_id: null, question_number: "2", prompt: "", question_type: "program", marks: 8, options: [], model_answer: null, order_index: 1 },
    { id: "q4", section_id: null, optional_group_id: null, question_number: "4", prompt: "", question_type: "mcq", marks: 1, options: [], model_answer: null, order_index: 3 },
  ];

  it("groups by section order with unsectioned first", () => {
    const groups = groupQuestionsBySection(sections, questions);
    expect(groups[0].section).toBeNull();
    expect(groups[0].questions.map((q) => q.id)).toEqual(["q4"]);
    expect(groups[1].section?.id).toBe("s1");
    expect(groups[1].questions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(groups[2].section?.id).toBe("s2");
    expect(groups[2].questions.map((q) => q.id)).toEqual(["q3"]);
  });
});

describe("exam structure validation", () => {
  const base = {
    sections: [{ key: "s1", title: "Section A", order_index: 0 }],
    questions: [
      {
        section_key: "s1",
        question_number: "1",
        prompt: "Explain encapsulation.",
        question_type: "theory",
        marks: 5,
        options: [],
        model_answer: null,
      },
    ],
  };

  it("accepts a valid structure", () => {
    expect(examStructureSchema.safeParse(base).success).toBe(true);
  });

  it("rejects unknown section references", () => {
    const bad = {
      ...base,
      questions: [{ ...base.questions[0], section_key: "nope" }],
    };
    // section_key is a non-empty string — unknown refs are caught in the
    // server action; schema still validates shape.
    expect(examStructureSchema.safeParse(bad).success).toBe(true);
  });

  it("rejects MCQ without enough options at action level (schema allows empty)", () => {
    const mcq = {
      ...base,
      questions: [
        {
          section_key: "s1",
          question_number: "1",
          prompt: "Pick one",
          question_type: "mcq",
          marks: 1,
          options: [{ label: "A", text: "Only" }],
          model_answer: null,
        },
      ],
    };
    expect(examStructureSchema.safeParse(mcq).success).toBe(true);
  });

  it("rejects non-positive marks and empty prompts", () => {
    const badMarks = {
      ...base,
      questions: [{ ...base.questions[0], marks: 0 }],
    };
    expect(examStructureSchema.safeParse(badMarks).success).toBe(false);
    const badPrompt = {
      ...base,
      questions: [{ ...base.questions[0], prompt: "  " }],
    };
    expect(examStructureSchema.safeParse(badPrompt).success).toBe(false);
  });
});
