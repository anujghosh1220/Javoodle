/** Lesson content block model stored in lessons.blocks (jsonb). */

export type LessonBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; code: string; language?: string }
  | { type: "output"; output: string; code?: string }
  | { type: "note"; text: string; tone?: "info" | "exam" | "warning" }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "keypoint"; text: string };

export function isLessonBlock(v: unknown): v is LessonBlock {
  if (typeof v !== "object" || v === null) return false;
  const t = (v as { type?: unknown }).type;
  return (
    t === "heading" || t === "paragraph" || t === "code" || t === "output" ||
    t === "note" || t === "list" || t === "keypoint"
  );
}

export function parseBlocks(raw: unknown): LessonBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isLessonBlock);
}

export interface LearnTopic {
  id: string;
  name: string;
  phase: number;
  orderIndex: number;
  description: string | null;
  lessonCount: number;
  completedCount: number;
}

export interface LearnLessonSummary {
  id: string;
  title: string;
  orderIndex: number;
  completed: boolean;
}
