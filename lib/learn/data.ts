import "server-only";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseBlocks, type LearnTopic, type LearnLessonSummary, type LessonBlock } from "./types";

export const PHASE_LABELS: Record<number, string> = {
  1: "Month 1 — Fundamentals",
  2: "Month 2 — Intermediate",
  3: "Month 3 — Revision & Exams",
};

function dbEnabled() {
  return isSupabaseConfigured() && hasServiceRoleKey();
}

/** All topics with lesson + completion counts for a student. */
export async function listLearnTopics(studentId: string | null): Promise<LearnTopic[]> {
  if (!dbEnabled()) return [];
  const admin = createAdminClient();

  const [topicsRes, lessonsRes, completionsRes] = await Promise.all([
    admin.from("topics").select("id,name,phase,order_index,description").order("phase").order("order_index"),
    admin.from("lessons").select("id,topic_id,order_index").eq("published", true),
    studentId
      ? admin.from("lesson_completions").select("lesson_id").eq("student_id", studentId)
      : Promise.resolve({ data: [] as { lesson_id: string }[] }),
  ]);

  const lessons = lessonsRes.data ?? [];
  const completed = new Set(((completionsRes as { data?: { lesson_id: string }[] }).data ?? []).map((c) => c.lesson_id));

  return (topicsRes.data ?? []).map((t) => {
    const topicLessons = lessons.filter((l) => l.topic_id === t.id);
    return {
      id: t.id,
      name: t.name,
      phase: t.phase,
      orderIndex: t.order_index,
      description: t.description,
      lessonCount: topicLessons.length,
      completedCount: topicLessons.filter((l) => completed.has(l.id)).length,
    };
  });
}

/** Lessons inside one topic with per-lesson completion for the student. */
export async function getTopicLessons(topicId: string, studentId: string | null): Promise<LearnLessonSummary[]> {
  if (!dbEnabled()) return [];
  const admin = createAdminClient();
  const [lessonsRes, completionsRes] = await Promise.all([
    admin.from("lessons").select("id,title,order_index").eq("topic_id", topicId).eq("published", true).order("order_index"),
    studentId
      ? admin.from("lesson_completions").select("lesson_id").eq("student_id", studentId)
      : Promise.resolve({ data: [] as { lesson_id: string }[] }),
  ]);
  const completed = new Set(((completionsRes as { data?: { lesson_id: string }[] }).data ?? []).map((c) => c.lesson_id));
  return (lessonsRes.data ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    orderIndex: l.order_index,
    completed: completed.has(l.id),
  }));
}

export interface LessonView {
  id: string;
  title: string;
  topicId: string;
  topicName: string;
  blocks: LessonBlock[];
  completed: boolean;
  prevLessonId: string | null;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
}

/** Full lesson payload for the student lesson page. */
export async function getLessonForStudent(lessonId: string, studentId: string | null): Promise<LessonView | null> {
  if (!dbEnabled()) return null;
  const admin = createAdminClient();

  const { data: lesson } = await admin
    .from("lessons")
    .select("id,title,topic_id,blocks,order_index")
    .eq("id", lessonId)
    .eq("published", true)
    .maybeSingle();
  if (!lesson) return null;

  const [{ data: topic }, { data: siblings }, completionsRes] = await Promise.all([
    admin.from("topics").select("id,name").eq("id", lesson.topic_id).maybeSingle(),
    admin
      .from("lessons")
      .select("id,title,order_index")
      .eq("topic_id", lesson.topic_id)
      .eq("published", true)
      .order("order_index"),
    studentId
      ? admin.from("lesson_completions").select("lesson_id").eq("student_id", studentId).eq("lesson_id", lessonId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const ordered = siblings ?? [];
  const idx = ordered.findIndex((s) => s.id === lesson.id);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  return {
    id: lesson.id,
    title: lesson.title,
    topicId: lesson.topic_id,
    topicName: (topic as { name?: string } | null)?.name ?? "Lesson",
    blocks: parseBlocks(lesson.blocks),
    completed: Boolean((completionsRes as { data?: unknown }).data),
    prevLessonId: prev?.id ?? null,
    nextLessonId: next?.id ?? null,
    nextLessonTitle: next?.title ?? null,
  };
}

/** The student's "continue where you left off" target: first uncompleted lesson in syllabus order. */
export async function getNextLessonForStudent(studentId: string | null): Promise<{ lessonId: string; title: string; topicName: string } | null> {
  const topics = await listLearnTopics(studentId);
  if (topics.length === 0) return null;

  // Walk topics in syllabus order; return first lesson the student hasn't finished.
  for (const topic of topics) {
    const lessons = await getTopicLessons(topic.id, studentId);
    if (lessons.length === 0) continue;
    const next = lessons.find((l) => !l.completed) ?? lessons[0];
    // If the topic is fully complete, move on — but only skip when ALL lessons done.
    if (lessons.every((l) => l.completed)) continue;
    return { lessonId: next.id, title: next.title, topicName: topic.name };
  }
  return null;
}

export async function isLessonCompleted(studentId: string, lessonId: string): Promise<boolean> {
  if (!dbEnabled()) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("lesson_completions")
    .select("id")
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  return Boolean(data);
}
