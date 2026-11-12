/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

export const QUESTION_TYPES = [
  "mcq",
  "fill_blank",
  "true_false",
  "output_prediction",
  "find_error",
  "theory",
  "coding",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_STATUSES = [
  "pending_review",
  "approved",
  "rejected",
  "needs_revision",
] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const ANSWER_STATUSES = [
  "unverified",
  "approved",
  "rejected",
  "needs_revision",
] as const;
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];

const idLike = z.union([z.string(), z.number()]).transform((v) => String(v));

export const provenanceSchema = z
  .object({
    source_document_id: z.string().uuid().optional().nullable(),
    source_year: z.union([z.number().int(), z.string(), z.null()]).optional(),
    source_page: z.union([z.number().int(), z.string(), z.null()]).optional(),
    source_question_number: z.union([z.string(), z.number(), z.null()]).optional(),
    source_paper: z.string().optional().nullable(),
    ai_generated: z.boolean().optional(),
    ai_generated_fields: z.array(z.string()).optional(),
    source_derived_fields: z.array(z.string()).optional(),
    notes: z.string().optional().nullable(),
  })
  .passthrough()
  .optional();

export const optionSchema = z
  .object({
    label: z.string().min(1),
    text: z.string().min(1),
    is_correct: z.boolean().optional(),
  })
  .passthrough();

const baseQuestionSchema = z
  .object({
    id: idLike.optional(),
    temp_id: idLike.optional(),
    question_text: z.string().min(1, "question_text is required"),
    question_type: z.enum(QUESTION_TYPES),
    marks: z.union([z.number(), z.string()]).refine((v) => {
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) && n > 0;
    }, "marks must be a positive number"),
    topic_ids: z.array(z.string()).optional().default([]),
    topic_names: z.array(z.string()).optional().default([]),
    difficulty: z.union([z.number().int().min(1).max(5), z.string()]).optional(),
    options: z.array(optionSchema).optional(),
    proposed_answer: z.any().optional(),
    model_answer: z.any().optional(),
    reference_solution: z.any().optional(),
    test_cases: z.array(z.any()).optional(),
    marking_rubric: z.any().optional(),
    explanation: z.any().optional(),
    source_document_id: z.string().uuid().optional().nullable(),
    source_year: z.union([z.number().int(), z.string(), z.null()]).optional(),
    source_page: z.union([z.number().int(), z.string(), z.null()]).optional(),
    source_question_number: z.union([z.string(), z.number(), z.null()]).optional(),
    provenance: provenanceSchema,
    subquestions: z.array(z.lazy((): z.ZodTypeAny => questionSchema)).optional(),
    group_key: z.string().optional().nullable(),
    order_index: z.number().int().optional(),
  })
  .passthrough();

export const questionSchema: z.ZodTypeAny = baseQuestionSchema.superRefine((q, ctx) => {
  const marksNum = typeof q.marks === "string" ? Number(q.marks) : q.marks;
  if (!Number.isFinite(marksNum) || marksNum <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["marks"], message: "marks must be a positive number" } as any);
  }
  if (q.question_type === "mcq") {
    const opts = q.options ?? [];
    if (!Array.isArray(opts) || opts.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "MCQ must have at least 2 options" });
    } else {
      opts.forEach((o: any, i: number) => {
        if (!o || typeof o.label !== "string" || !o.label.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options", i, "label"], message: "option label is required" } as any);
        }
        if (!o || typeof o.text !== "string" || !o.text.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options", i, "text"], message: "option text is required" } as any);
        }
      });
      const correctCount = opts.filter((o: any) => o?.is_correct === true).length;
      if (correctCount === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "MCQ must mark at least one correct option" } as any);
      }
    }
  }
  if (q.question_type === "coding" && q.test_cases && !Array.isArray(q.test_cases)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["test_cases"], message: "test_cases must be an array" } as any);
  }
});

export const importPayloadSchema = z
  .object({
    questions: z.array(questionSchema).min(1, { message: "questions array is required" }),
    metadata: z.record(z.string(), z.any()).optional(),
    source: z.record(z.string(), z.any()).optional(),
  })
  .passthrough();

export type ImportQuestion = z.infer<typeof baseQuestionSchema> & {
  subquestions?: ImportQuestion[];
  [key: string]: any;
};

export interface ValidationIssue {
  questionIndex: number;
  questionRef: string;
  path: string;
  message: string;
}

function refFor(q: any, index: number): string {
  const num = q?.source_question_number ?? q?.id ?? q?.temp_id;
  return num != null ? `Q${String(num)}` : `Question #${index + 1}`;
}

export function validateImportPayload(input: unknown): {
  ok: boolean;
  data?: { questions: ImportQuestion[]; metadata?: any; source?: any; [k: string]: any };
  issues: ValidationIssue[];
} {
  const parsed = importPayloadSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data as any, issues: [] };
  }
  const issues: ValidationIssue[] = parsed.error.issues.map((iss) => {
    const idx = typeof iss.path[0] === "number" ? (iss.path[0] as number) : (iss.path[1] === "questions" && typeof iss.path[2] === "number" ? (iss.path[2] as number) : -1);
    const qArr = (input as any)?.questions;
    const q = Array.isArray(qArr) && idx >= 0 ? qArr[idx] : null;
    const pathStr = iss.path.map(String).join(".") || "(root)";
    return {
      questionIndex: idx,
      questionRef: idx >= 0 ? refFor(q, idx) : "payload",
      path: pathStr,
      message: iss.message,
    };
  });
  // also collect per-question issues for better reporting
  const root = input as any;
  if (Array.isArray(root?.questions)) {
    root.questions.forEach((q: any, i: number) => {
      const r = questionSchema.safeParse(q);
      if (!r.success) {
        for (const iss of r.error.issues) {
          const pathStr = `questions.${i}.${iss.path.map(String).join(".")}`.replace(/\.$/, "");
          const exists = issues.some((x) => x.path === pathStr && x.message === iss.message);
          if (!exists) issues.push({ questionIndex: i, questionRef: refFor(q, i), path: pathStr, message: iss.message });
        }
      }
    });
  }
  const dedup = Array.from(new Map(issues.map((i) => [`${i.path}|${i.message}`, i])).values());
  const success = (parsed as any).success === true;
  return {
    ok: dedup.length === 0 && success,
    data: success ? ((parsed as any).data as any) : undefined,
    issues: dedup,
  };
}

export function normalizeTextForDedup(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[`*_#>\-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

export function similarity(a: string, b: string): number {
  const ta = new Set(normalizeTextForDedup(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeTextForDedup(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}
