import { z } from "zod";

// ============================================================================
// Shared exam types & pure helpers.
// This module is client-safe: NO server-only imports. Anything imported by a
// "use client" component must live here (or in lib/utils).
// ============================================================================

export type PaperQuestionType =
  | "theory"
  | "program"
  | "output"
  | "mcq"
  | "short_answer"
  | "other";

export const PAPER_QUESTION_TYPES: PaperQuestionType[] = [
  "theory",
  "program",
  "output",
  "mcq",
  "short_answer",
  "other",
];

export const PAPER_QUESTION_TYPE_LABELS: Record<PaperQuestionType, string> = {
  theory: "Theory",
  program: "Java program",
  output: "Output prediction",
  mcq: "MCQ",
  short_answer: "Short answer",
  other: "Other",
};

export interface McqOption {
  label: string;
  text: string;
}

export interface PaperQuestion {
  id: string;
  exam_id: string;
  section_id: string | null;
  optional_group_id: string | null;
  question_number: string;
  prompt: string;
  question_type: PaperQuestionType;
  marks: number;
  options: McqOption[];
  model_answer: string | null;
  order_index: number;
}

export interface ExamSection {
  id: string;
  exam_id: string;
  title: string;
  order_index: number;
  marks: number;
}

/** An "attempt any N" group of optional questions with a capped counted total. */
export interface ExamOptionalGroup {
  id: string;
  exam_id: string;
  title: string;
  pick_count: number;
  max_counted_marks: number;
  order_index: number;
}

export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  class_name: string;
  description: string | null;
  instructions: string | null;
  duration_minutes: number;
  reading_time_minutes: number;
  total_marks: number;
  passing_marks: number | null;
  opens_at: string | null;
  closes_at: string | null;
  status: "draft" | "published" | "archived";
  release_model_answers: boolean;
  paper_document_id: string | null;
}

export type AttemptStatus =
  | "in_progress"
  | "submitted"
  | "under_evaluation"
  | "evaluation_completed"
  | "result_published"
  | "evaluated";

export const ATTEMPT_STATUS_LABELS: Record<AttemptStatus, string> = {
  in_progress: "In progress",
  submitted: "Submitted",
  under_evaluation: "Under evaluation",
  evaluation_completed: "Evaluation completed",
  result_published: "Result published",
  evaluated: "Evaluated",
};

/** Frozen copy of everything a student attempt needs. Written once at start. */
export interface ExamSnapshot {
  version: 1;
  exam: {
    title: string;
    subject: string;
    class_name: string;
    description: string | null;
    instructions: string | null;
    duration_minutes: number;
    reading_time_minutes: number;
    total_marks: number;
    passing_marks: number | null;
    release_model_answers: boolean;
  };
  sections: Array<Pick<ExamSection, "id" | "title" | "order_index" | "marks">>;
  optional_groups: Array<{
    id: string;
    title: string;
    pick_count: number;
    max_counted_marks: number;
    order_index: number;
  }>;
  questions: Array<
    Pick<
      PaperQuestion,
      | "id"
      | "section_id"
      | "optional_group_id"
      | "question_number"
      | "prompt"
      | "question_type"
      | "marks"
      | "options"
      | "model_answer"
      | "order_index"
    >
  >;
}

export interface ExamAnswer {
  paper_question_id: string;
  answer_text: string;
  mcq_option: string | null;
}

export interface ExamEvaluation {
  paper_question_id: string;
  marks_awarded: number;
  feedback: string | null;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

/** An exam is visible to students only when published and inside its window. */
export function isExamAvailable(
  exam: Pick<ExamPaper, "status" | "opens_at" | "closes_at">,
  now: Date = new Date()
): boolean {
  if (exam.status !== "published") return false;
  if (exam.opens_at && now.getTime() < new Date(exam.opens_at).getTime()) return false;
  if (exam.closes_at && now.getTime() > new Date(exam.closes_at).getTime()) return false;
  return true;
}

/** Whole minutes remaining until the deadline (never negative). */
export function remainingMs(deadlineAt: string | Date, now: Date = new Date()): number {
  const end = deadlineAt instanceof Date ? deadlineAt.getTime() : new Date(deadlineAt).getTime();
  return Math.max(0, end - now.getTime());
}

export function isAttemptExpired(deadlineAt: string | Date | null, now: Date = new Date()): boolean {
  if (!deadlineAt) return false;
  return remainingMs(deadlineAt, now) <= 0;
}

/** mm:ss (or h:mm:ss past one hour) countdown text. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function percentageOf(obtained: number, total: number): number | null {
  if (!total || total <= 0) return null;
  return Math.round((obtained / total) * 10000) / 100;
}

/** Marks validation shared by evaluation writes. Returns an error message or null. */
export function validateMarksAwarded(
  marks: number,
  maxMarks: number
): string | null {
  if (!Number.isFinite(marks)) return "Marks must be a number.";
  if (marks < 0) return "Marks cannot be negative.";
  if (marks > maxMarks + 1e-9) return `Marks cannot exceed ${maxMarks}.`;
  return null;
}

export function isAnswerEmpty(
  a: { answer_text?: string; mcq_option?: string | null; text?: string; mcq?: string | null }
): boolean {
  const mcq = a.mcq_option ?? a.mcq ?? null;
  const text = a.answer_text ?? a.text ?? "";
  return !mcq && text.trim().length === 0;
}

// ---------------------------------------------------------------------------
// Optional question groups & counted-score helpers (pure, unit-tested)
// ---------------------------------------------------------------------------

/**
 * Question ids that must be evaluated for an attempt to be "complete":
 * every compulsory question plus the student's *selected* optional
 * questions. Attempts without recorded selections (pre-0005) treat all
 * optional questions as required, preserving the old behaviour.
 */
export function requiredQuestionIds(
  snapshot: Pick<ExamSnapshot, "questions" | "optional_groups"> | null | undefined,
  selectedIds: ReadonlySet<string> | string[] | null | undefined
): Set<string> {
  const questions = snapshot?.questions ?? [];
  const groups = snapshot?.optional_groups ?? [];
  const hasGroups = groups.length > 0;
  const selected = selectedIds ? new Set(selectedIds) : null;
  const required = new Set<string>();
  for (const q of questions) {
    if (!hasGroups || !q.optional_group_id) {
      required.add(q.id);
      continue;
    }
    // Optional question: required only if the student selected it.
    // No selections recorded → require it (legacy attempts).
    if (!selected || selected.size === 0 || selected.has(q.id)) {
      required.add(q.id);
    }
  }
  return required;
}

export interface CountedScore {
  /** Marks that count toward the exam total (group sums are capped). */
  totalScore: number;
  /** Raw awarded sum before group caps (for display/debugging). */
  rawScore: number;
}

/**
 * Compute the score that counts toward total_marks:
 *  - compulsory questions contribute their full awarded marks;
 *  - each optional group contributes min(sum of awarded marks on the
 *    student's selected questions, max_counted_marks).
 * Awards on unselected optional questions never count.
 */
export function computeCountedScore(
  evaluations: Array<{ paper_question_id: string; marks_awarded: number }>,
  snapshot: Pick<ExamSnapshot, "questions" | "optional_groups"> | null | undefined,
  selectedIds: ReadonlySet<string> | string[] | null | undefined
): CountedScore {
  const questions = snapshot?.questions ?? [];
  const groups = snapshot?.optional_groups ?? [];
  const selected = selectedIds ? new Set(selectedIds) : null;
  const qById = new Map(questions.map((q) => [q.id, q]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  let compulsory = 0;
  const groupSums = new Map<string, number>();
  let raw = 0;

  for (const ev of evaluations) {
    const awarded = Number(ev.marks_awarded) || 0;
    raw += awarded;
    const q = qById.get(ev.paper_question_id);
    if (!q) continue;
    const gid = q.optional_group_id;
    if (!gid || !groupById.has(gid)) {
      compulsory += awarded;
      continue;
    }
    // Optional question — counts only when selected (or no selection data).
    if (selected && selected.size > 0 && !selected.has(q.id)) continue;
    groupSums.set(gid, (groupSums.get(gid) ?? 0) + awarded);
  }

  let total = compulsory;
  for (const g of groups) {
    const sum = groupSums.get(g.id) ?? 0;
    total += Math.min(sum, Number(g.max_counted_marks));
  }
  return { totalScore: Math.round(total * 100) / 100, rawScore: Math.round(raw * 100) / 100 };
}

/**
 * Achievable marks for publish validation: compulsory marks in full plus
 * each group's capped counted marks. This is what exam.total_marks must
 * equal — it can be less than the sum of all question marks when optional
 * questions exist.
 */
export function achievableMarks(
  questions: Array<Pick<PaperQuestion, "marks" | "optional_group_id">>,
  groups: Array<Pick<ExamOptionalGroup, "id" | "pick_count" | "max_counted_marks">>
): number {
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const memberMarks = new Map<string, number[]>();
  let compulsory = 0;
  for (const q of questions) {
    const gid = q.optional_group_id;
    if (!gid || !groupById.has(gid)) {
      compulsory += Number(q.marks);
    } else {
      const arr = memberMarks.get(gid) ?? [];
      arr.push(Number(q.marks));
      memberMarks.set(gid, arr);
    }
  }
  let total = compulsory;
  for (const g of groups) {
    total += Number(g.max_counted_marks);
  }
  void memberMarks;
  return Math.round(total * 100) / 100;
}

/** Validate a group's member questions against pick_count / max marks. */
export function validateOptionalGroup(
  group: { pick_count: number; max_counted_marks: number },
  memberMarks: number[]
): string | null {
  if (group.pick_count <= 0) return "Pick count must be at least 1.";
  if (memberMarks.length < group.pick_count) {
    return `Optional group needs at least ${group.pick_count} questions (has ${memberMarks.length}).`;
  }
  const sum = memberMarks.reduce((a, b) => a + b, 0);
  if (group.max_counted_marks > sum + 1e-9) {
    return `Max counted marks (${group.max_counted_marks}) exceeds the group's total available marks (${sum}).`;
  }
  return null;
}

/** Group flat ordered questions under their sections for display. */
export function groupQuestionsBySection(
  sections: ExamSnapshot["sections"],
  questions: ExamSnapshot["questions"]
): Array<{
  section: ExamSnapshot["sections"][number] | null;
  questions: ExamSnapshot["questions"];
}> {
  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);
  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);
  const groups: Array<{
    section: ExamSnapshot["sections"][number] | null;
    questions: ExamSnapshot["questions"];
  }> = sortedSections.map((section) => ({
    section,
    questions: sortedQuestions.filter((q) => q.section_id === section.id),
  }));
  const unsectioned = sortedQuestions.filter(
    (q) => !q.section_id || !sortedSections.some((s) => s.id === q.section_id)
  );
  if (unsectioned.length > 0) groups.unshift({ section: null, questions: unsectioned });
  return groups.filter((g) => g.questions.length > 0);
}

// ---------------------------------------------------------------------------
// Zod schemas for admin-authored structure (validated server-side on save)
// ---------------------------------------------------------------------------

export const mcqOptionSchema = z.object({
  label: z.string().trim().min(1).max(8),
  text: z.string().trim().min(1).max(2000),
});

export const paperQuestionInputSchema = z.object({
  id: z.string().uuid().optional(),
  section_key: z.string().min(1),
  optional_group_key: z.string().nullable().optional(),
  question_number: z.string().trim().min(1).max(20),
  prompt: z.string().trim().min(1).max(20000),
  question_type: z.enum(["theory", "program", "output", "mcq", "short_answer", "other"]),
  marks: z.number().positive().max(999),
  options: z.array(mcqOptionSchema).max(10).default([]),
  model_answer: z.string().max(20000).nullable().optional(),
});

export const optionalGroupInputSchema = z.object({
  key: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  pick_count: z.number().int().positive().max(500),
  max_counted_marks: z.number().positive().max(9999),
  order_index: z.number().int().min(0),
});

export const examStructureSchema = z.object({
  sections: z
    .array(
      z.object({
        key: z.string().min(1),
        title: z.string().trim().min(1).max(120),
        order_index: z.number().int().min(0),
      })
    )
    .max(20),
  optional_groups: z.array(optionalGroupInputSchema).max(10).default([]),
  questions: z.array(paperQuestionInputSchema).max(500),
});

export type ExamStructureInput = z.infer<typeof examStructureSchema>;
export type PaperQuestionInput = z.infer<typeof paperQuestionInputSchema>;
export type OptionalGroupInput = z.infer<typeof optionalGroupInputSchema>;

// ---------------------------------------------------------------------------
// PDF extraction draft (produced by lib/exams/extraction/parser.ts, edited in
// the admin review UI, then saved via saveExamStructureAction)
// ---------------------------------------------------------------------------

export interface DraftQuestion {
  key: string;
  section_key: string;
  optional_group_key: string | null;
  question_number: string;
  prompt: string;
  question_type: PaperQuestionType;
  marks: number | null;
  options: McqOption[];
  /** Human-readable extraction warnings for this question. */
  warnings: string[];
}

export interface DraftSection {
  key: string;
  title: string;
  order_index: number;
}

export interface DraftOptionalGroup {
  key: string;
  title: string;
  pick_count: number;
  max_counted_marks: number;
  order_index: number;
}

export interface ExamDraftMeta {
  title: string | null;
  subject: string | null;
  class_name: string | null;
  duration_minutes: number | null;
  reading_time_minutes: number | null;
  total_marks: number | null;
  instructions: string | null;
}

export interface ExamDraft {
  meta: ExamDraftMeta;
  sections: DraftSection[];
  optional_groups: DraftOptionalGroup[];
  questions: DraftQuestion[];
  /** Paper-level warnings (unparsed blocks, missing marks, etc.). */
  warnings: string[];
  /** Extracted text blocks that looked important but could not be placed. */
  unparsedBlocks: string[];
  confidence: "high" | "medium" | "low";
}
