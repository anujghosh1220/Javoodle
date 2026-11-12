import { z } from "zod";

/**
 * Structured question JSON — the contract between ChatGPT/manual analysis
 * and the question bank. Extra fields are preserved in `provenance`, never
 * silently dropped.
 */

export const questionTypeSchema = z.enum([
  "mcq",
  "fill_blank",
  "true_false",
  "output_prediction",
  "find_error",
  "theory",
  "coding",
]);

export const testCaseSchema = z.object({
  input: z.string().default(""),
  expected_output: z.string().min(1, "expected_output required"),
  is_hidden: z.boolean().default(true),
});

export const rubricItemSchema = z.object({
  criteria: z.string().min(1),
  max_marks: z.number().positive(),
  keywords: z.array(z.string()).default([]),
});

export interface QuestionImportItem {
  question_text: string;
  question_type: z.infer<typeof questionTypeSchema>;
  marks: number;
  topic_names: string[];
  difficulty: number;
  options?: { label: string; text: string }[];
  correct_option?: string;
  proposed_answer?: string;
  model_answer?: string;
  reference_solution?: string;
  explanation?: string;
  test_cases: { input: string; expected_output: string; is_hidden: boolean }[];
  marking_rubric: { criteria: string; max_marks: number; keywords: string[] }[];
  source_document_id?: string;
  source_year?: number;
  source_page?: number;
  source_question_number?: string;
  subquestions?: QuestionImportItem[];
  extra?: Record<string, unknown>;
}

export const questionImportItemSchema: z.ZodType<QuestionImportItem> = z.object({
  question_text: z.string().min(3, "question_text required"),
  question_type: questionTypeSchema,
  marks: z.number().positive("marks must be > 0"),
  topic_names: z.array(z.string()).default([]),
  difficulty: z.number().int().min(1).max(5).default(1),
  // MCQ
  options: z
    .array(z.object({ label: z.string(), text: z.string().min(1) }))
    .optional(),
  correct_option: z.string().optional(), // label e.g. "A"
  // Answers / solutions
  proposed_answer: z.string().optional(),
  model_answer: z.string().optional(),
  reference_solution: z.string().optional(), // Java code
  explanation: z.string().optional(),
  // Program questions
  test_cases: z.array(testCaseSchema).default([]),
  marking_rubric: z.array(rubricItemSchema).default([]),
  // Provenance
  source_document_id: z.string().uuid().optional(),
  source_year: z.number().int().optional(),
  source_page: z.number().int().optional(),
  source_question_number: z.string().optional(),
  subquestions: z
    .array(z.lazy(() => questionImportItemSchema))
    .optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
}) as z.ZodType<QuestionImportItem>;

export const importFileSchema = z.object({
  questions: z.array(questionImportItemSchema).min(1, "questions array is empty"),
});

export type ImportFile = z.infer<typeof importFileSchema>;

/** Flatten subquestions into top-level import items. */
export function flattenQuestions(
  items: QuestionImportItem[],
  parentNumber?: string
): QuestionImportItem[] {
  const out: QuestionImportItem[] = [];
  for (const item of items) {
    const num = parentNumber
      ? `${parentNumber}.${item.source_question_number ?? ""}`
      : item.source_question_number;
    const { subquestions, ...rest } = item;
    out.push({ ...rest, source_question_number: num ?? rest.source_question_number });
    if (subquestions?.length) {
      out.push(...flattenQuestions(subquestions, num));
    }
  }
  return out;
}
