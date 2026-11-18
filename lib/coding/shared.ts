import { z } from "zod";

export type CodingDifficulty = "easy" | "medium" | "hard";
export type CodingQuestionStatus = "draft" | "published" | "archived";
export type CodingReviewStatus = "pending" | "reviewed" | "resubmit_requested";

export interface CodingQuestion {
  id: string;
  title: string;
  description: string;
  problem_statement: string;
  input_format: string;
  output_format: string;
  constraints: string;
  hints: string;
  starter_code: string;
  marks: number;
  difficulty: CodingDifficulty;
  topic: string;
  time_recommendation_minutes: number | null;
  status: CodingQuestionStatus;
  created_at: string;
}

export interface CodingTestCase {
  id: string;
  question_id: string;
  kind: "sample" | "hidden";
  input_data: string;
  expected_output: string;
  weight: number;
  order_index: number;
}

export interface CodingSubmission {
  id: string;
  question_id: string;
  student_id: string;
  source_code: string;
  last_output: string | null;
  last_status: string | null;
  execution_meta: unknown;
  attempt_number: number;
  review_status: CodingReviewStatus;
  marks_awarded: number | null;
  feedback: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const DIFFICULTIES: CodingDifficulty[] = ["easy", "medium", "hard"];
export const DIFFICULTY_LABELS: Record<CodingDifficulty, string> = {
  easy: "Easy", medium: "Medium", hard: "Hard",
};

export const codingQuestionInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).default(""),
  problem_statement: z.string().max(20000).default(""),
  input_format: z.string().max(5000).default(""),
  output_format: z.string().max(5000).default(""),
  constraints: z.string().max(5000).default(""),
  hints: z.string().max(5000).default(""),
  starter_code: z.string().max(50000).default(""),
  marks: z.number().positive().max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topic: z.string().trim().max(120).default(""),
  time_recommendation_minutes: z.number().int().positive().max(600).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
});

export const testCaseInputSchema = z.object({
  kind: z.enum(["sample", "hidden"]),
  input_data: z.string().max(20000),
  expected_output: z.string().max(20000),
  weight: z.number().positive().max(100).default(1),
});

export type CodingQuestionInput = z.infer<typeof codingQuestionInputSchema>;
export type TestCaseInput = z.infer<typeof testCaseInputSchema>;

/** Strip hidden test cases before anything reaches a student. */
export function studentSafeQuestion(q: CodingQuestion, sampleCases: CodingTestCase[]) {
  return {
    id: q.id, title: q.title, description: q.description,
    problem_statement: q.problem_statement, input_format: q.input_format,
    output_format: q.output_format, constraints: q.constraints,
    hints: q.hints, starter_code: q.starter_code, marks: q.marks,
    difficulty: q.difficulty, topic: q.topic,
    time_recommendation_minutes: q.time_recommendation_minutes,
    sample_cases: sampleCases
      .filter((t) => t.kind === "sample")
      .map((t) => ({ id: t.id, input_data: t.input_data, expected_output: t.expected_output })),
  };
}

export function sha256Hex(input: string): string {
  // Synchronous FNV-1a fallback is fine for change-detection hashing here;
  // crypto.subtle is async and server actions already await.
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0") + input.length.toString(16);
}

export const MAX_SOURCE_LENGTH = 50000;
export const MAX_STDIN_LENGTH = 20000;
export const MAX_OUTPUT_LENGTH = 20000;

/**
 * Reserved `topic` value for the seeded "Java Playground" sandbox question.
 * It exists only so playground runs have a coding_questions row to log
 * against (coding_execution_runs.question_id is NOT NULL) and is filtered
 * out of the Coding Lab listing.
 */
export const PLAYGROUND_TOPIC = "__playground_sandbox__";

export const PLAYGROUND_TITLE = "Java Playground";

export const PLAYGROUND_STARTER_CODE = `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        // Write and run any Java program here.
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter your name: ");
        String name = sc.nextLine();
        System.out.println("Hello, " + name + "!");
    }
}
`;

