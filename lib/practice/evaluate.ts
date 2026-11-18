import type { PracticeType } from "./data";

export interface PracticeQuestionRow {
  id: string;
  type: string;
  text: string;
  marks: number;
  version: number;
  correct_answer_text: string | null;
  explanation: string | null;
  marking_rubric: unknown;
}

export interface PracticeOptionRow {
  id: string;
  question_id: string;
  is_correct: boolean;
}

export interface EvalResult {
  correct: boolean;
  /** 0..1 fraction of marks earned (theory can be partial). */
  fraction: number;
  marksAwarded: number;
  maxMarks: number;
  explanation: string | null;
  /** Short "why" shown to the student. */
  verdict: string;
}

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;:!?]+$/g, "");
}

/** correct_answer_text may be a plain string or a JSON array of accepted answers. */
export function acceptedAnswers(correctAnswerText: string | null): string[] {
  if (!correctAnswerText) return [];
  const raw = correctAnswerText.trim();
  if (raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map((a) => normalizeAnswer(String(a)));
    } catch {
      /* fall through to plain text */
    }
  }
  return [normalizeAnswer(raw)];
}

interface RubricCriterion {
  criteria?: string;
  max_marks?: number;
  keywords?: string[];
}

function rubricCriteria(rubric: unknown): RubricCriterion[] {
  if (Array.isArray(rubric)) return rubric as RubricCriterion[];
  if (rubric && typeof rubric === "object") {
    const c = (rubric as { criteria?: unknown }).criteria;
    if (Array.isArray(c)) return c as RubricCriterion[];
  }
  return [];
}

const STOPWORDS = new Set(("the a an and or of to in is are was were for on with as at by it its this that be been has have had do does not but from they you your we our he she his her them their what which who how why when where explain give state write difference between used use using").split(" "));

function contentTokens(s: string): string[] {
  return normalizeAnswer(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(" ")
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/** Keyword-overlap rubric scoring for theory answers — partial credit allowed. */
function scoreTheory(answer: string, rubric: unknown, modelAnswer: string | null): { fraction: number; verdict: string } {
  const criteria = rubricCriteria(rubric);
  const text = ` ${normalizeAnswer(answer)} `;

  if (criteria.length === 0) {
    // No rubric: score keyword coverage against the model answer.
    if (!answer.trim()) return { fraction: 0, verdict: "Write your answer first — even a few key points earn marks." };
    if (!modelAnswer) {
      const fraction = answer.trim().length >= 20 ? 1 : answer.trim().length > 0 ? 0.5 : 0;
      return { fraction, verdict: fraction >= 1 ? "Good attempt — compare with the model answer." : "Your answer looks too short — expand on the key points." };
    }
    const wanted = [...new Set(contentTokens(modelAnswer))];
    if (wanted.length === 0) {
      const fraction = answer.trim().length >= 20 ? 1 : 0.5;
      return { fraction, verdict: fraction >= 1 ? "Reasonable answer — check it covers the key ideas." : "Too brief — cover the main points." };
    }
    const hay = ` ${contentTokens(answer).join(" ")} `;
    const hits = wanted.filter((w) => hay.includes(` ${w} `) || hay.includes(w)).length;
    const coverage = hits / wanted.length;
    const fraction = Math.min(1, coverage / 0.6); // ~60% keyword coverage = full credit
    const pct = Math.round(fraction * 100);
    const verdict =
      fraction >= 0.8 ? `Strong answer — you hit most of the key ideas (${pct}%).`
      : fraction >= 0.5 ? `Good effort — you covered part of it (${pct}%). Check the explanation for what was missing.`
      : fraction > 0 ? `A start — some right ideas (${pct}%). Read the explanation carefully.`
      : "Not quite — read the explanation and try again.";
    return { fraction, verdict };
  }

  let earned = 0;
  let possible = 0;
  const missed: string[] = [];
  for (const c of criteria) {
    const max = typeof c.max_marks === "number" && c.max_marks > 0 ? c.max_marks : 1;
    possible += max;
    const kws = Array.isArray(c.keywords) ? c.keywords.filter((k) => typeof k === "string" && k.trim()) : [];
    if (kws.length === 0) {
      // No keywords — credit if the criterion's own words appear.
      const label = normalizeAnswer(String(c.criteria ?? ""));
      const hit = label.length > 0 && text.includes(` ${label} `);
      if (hit) earned += max;
      else missed.push(String(c.criteria ?? "a point"));
      continue;
    }
    const hits = kws.filter((k) => text.includes(` ${normalizeAnswer(k)} `) || text.includes(normalizeAnswer(k))).length;
    const frac = hits / kws.length;
    earned += max * Math.min(1, frac * 1.6); // generous: ~62% keyword coverage = full credit
    if (frac < 0.5) missed.push(String(c.criteria ?? "a point"));
  }
  const fraction = possible > 0 ? Math.min(1, earned / possible) : 0;
  const pct = Math.round(fraction * 100);
  const verdict =
    fraction >= 0.8 ? `Excellent — you covered the key points (${pct}%).`
    : fraction >= 0.5 ? `Good effort — you got part of it (${pct}%). Check the explanation for what was missing.`
    : fraction > 0 ? `A start — you mentioned some right ideas (${pct}%). Read the explanation carefully.`
    : "Not quite — read the explanation and try again.";
  return { fraction, verdict };
}

export function evaluatePracticeAnswer(args: {
  question: PracticeQuestionRow;
  options: PracticeOptionRow[];
  type: PracticeType;
  payload: unknown;
}): EvalResult {
  const { question, options, type, payload } = args;
  const maxMarks = Number(question.marks) || 1;
  const p = (payload ?? {}) as Record<string, unknown>;

  const done = (correct: boolean, fraction: number, verdict: string): EvalResult => ({
    correct,
    fraction,
    marksAwarded: Math.round(maxMarks * fraction * 10) / 10,
    maxMarks,
    explanation: question.explanation,
    verdict,
  });

  switch (type) {
    case "mcq": {
      const optionId = typeof p.optionId === "string" ? p.optionId : "";
      const chosen = options.find((o) => o.id === optionId);
      if (!chosen) return done(false, 0, "Please select an option.");
      const correct = chosen.is_correct;
      return done(correct, correct ? 1 : 0,
        correct ? "Correct — well spotted!" : "Not quite — read the explanation to see why.");
    }
    case "fill_blank":
    case "true_false":
    case "output_prediction":
    case "find_error": {
      const text = typeof p.text === "string" ? p.text : "";
      if (!text.trim()) return done(false, 0, "Type your answer first.");
      const accepted = acceptedAnswers(question.correct_answer_text);
      const correct = accepted.length > 0 && accepted.includes(normalizeAnswer(text));
      const hint =
        type === "output_prediction" ? "Predict carefully — Java output has no extra spaces or quotes."
        : type === "find_error" ? "Give the corrected statement exactly as it should appear."
        : type === "true_false" ? "Answer with True or False."
        : "Check spelling and Java keywords exactly.";
      return done(correct, correct ? 1 : 0,
        correct ? "Correct — exactly right!" : `Not quite. ${hint}`);
    }
    case "theory": {
      const text = typeof p.text === "string" ? p.text : "";
      if (!text.trim()) return done(false, 0, "Write your answer first — even a few key points earn marks.");
      const { fraction, verdict } = scoreTheory(text, question.marking_rubric, question.correct_answer_text);
      return done(fraction >= 0.8, fraction, verdict);
    }
    default:
      return done(false, 0, "This question type can't be practised here.");
  }
}
