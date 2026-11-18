/** Shared practice types/constants — safe for client components (no server-only). */

export const PRACTICE_TYPES = [
  "mcq",
  "fill_blank",
  "true_false",
  "output_prediction",
  "find_error",
  "theory",
] as const;
export type PracticeType = (typeof PRACTICE_TYPES)[number];

export const PRACTICE_TYPE_LABELS: Record<PracticeType, string> = {
  mcq: "Multiple choice",
  fill_blank: "Fill in the blank",
  true_false: "True or False",
  output_prediction: "Predict the output",
  find_error: "Find the error",
  theory: "Theory",
};

export interface PracticeQuestionSafe {
  id: string;
  type: PracticeType;
  text: string;
  marks: number;
  difficulty: number;
  topicName: string | null;
  options?: Array<{ id: string; label: string; text: string }>;
}
