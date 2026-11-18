import "server-only";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRACTICE_TYPES, type PracticeType, type PracticeQuestionSafe } from "./shared";

export { PRACTICE_TYPES, PRACTICE_TYPE_LABELS } from "./shared";
export type { PracticeType, PracticeQuestionSafe } from "./shared";

export interface PracticeTopicSummary {
  topicId: string;
  topicName: string;
  questionCount: number;
  attempted: number;
  correct: number;
}

function enabled() {
  return isSupabaseConfigured() && hasServiceRoleKey();
}

/** Topics that have at least one approved question, with the student's attempt stats. */
export async function listPracticeTopics(studentId: string | null): Promise<PracticeTopicSummary[]> {
  if (!enabled()) return [];
  const admin = createAdminClient();
  const { data: questions } = await admin
    .from("questions")
    .select("id,topic_id,type")
    .eq("status", "approved")
    .eq("question_status", "approved")
    .eq("answer_status", "approved")
    .in("type", [...PRACTICE_TYPES]);
  const qs = questions ?? [];
  if (qs.length === 0) return [];

  const topicIds = [...new Set(qs.map((q) => q.topic_id).filter(Boolean))] as string[];
  const [{ data: topics }, historyRes] = await Promise.all([
    topicIds.length
      ? admin.from("topics").select("id,name").in("id", topicIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    studentId
      ? admin.from("practice_history").select("question_id,correct").eq("student_id", studentId)
      : Promise.resolve({ data: [] as { question_id: string | null; correct: boolean | null }[] }),
  ]);

  const topicName = new Map((topics ?? []).map((t) => [t.id, t.name]));
  const stats = new Map<string, { attempted: number; correct: number }>();
  const qTopic = new Map(qs.map((q) => [q.id, q.topic_id]));
  for (const h of ((historyRes as { data?: { question_id: string | null; correct: boolean | null }[] }).data ?? [])) {
    if (!h.question_id) continue;
    const tid = qTopic.get(h.question_id);
    if (!tid) continue;
    const s = stats.get(tid) ?? { attempted: 0, correct: 0 };
    s.attempted += 1;
    if (h.correct) s.correct += 1;
    stats.set(tid, s);
  }

  const byTopic = new Map<string, PracticeTopicSummary>();
  for (const q of qs) {
    const tid = q.topic_id ?? "untopicked";
    const s = byTopic.get(tid) ?? {
      topicId: tid,
      topicName: tid === "untopicked" ? "General" : topicName.get(tid) ?? "General",
      questionCount: 0,
      attempted: 0,
      correct: 0,
    };
    s.questionCount += 1;
    byTopic.set(tid, s);
  }
  for (const [tid, s] of byTopic) {
    const st = stats.get(tid);
    if (st) { s.attempted = st.attempted; s.correct = st.correct; }
  }
  return [...byTopic.values()].sort((a, b) => a.topicName.localeCompare(b.topicName));
}

/**
 * Fetch a practice set: approved, answer-approved questions, stripped of all
 * answer material. `topicId` "all" mixes topics; a type filter narrows further.
 */
export async function getPracticeQuestions(
  opts: { topicId?: string | null; type?: PracticeType | null; limit?: number } = {}
): Promise<PracticeQuestionSafe[]> {
  if (!enabled()) return [];
  const admin = createAdminClient();
  let q = admin
    .from("questions")
    .select("id,type,text,marks,difficulty,topic_id")
    .eq("status", "approved")
    .eq("question_status", "approved")
    .eq("answer_status", "approved")
    .in("type", [...PRACTICE_TYPES])
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 10);
  if (opts.topicId && opts.topicId !== "all") q = q.eq("topic_id", opts.topicId);
  if (opts.type) q = q.eq("type", opts.type);

  const { data: questions } = await q;
  const qs = questions ?? [];
  if (qs.length === 0) return [];

  const topicIds = [...new Set(qs.map((x) => x.topic_id).filter(Boolean))] as string[];
  const mcqIds = qs.filter((x) => x.type === "mcq").map((x) => x.id);
  const [{ data: topics }, { data: options }] = await Promise.all([
    topicIds.length
      ? admin.from("topics").select("id,name").in("id", topicIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    mcqIds.length
      ? admin.from("question_options").select("id,question_id,label,text,order_index").in("question_id", mcqIds).order("order_index")
      : Promise.resolve({ data: [] as { id: string; question_id: string; label: string; text: string; order_index: number }[] }),
  ]);

  const topicName = new Map((topics ?? []).map((t) => [t.id, t.name]));
  const optsByQ = new Map<string, Array<{ id: string; label: string; text: string }>>();
  for (const o of options ?? []) {
    const arr = optsByQ.get(o.question_id) ?? [];
    arr.push({ id: o.id, label: o.label, text: o.text });
    optsByQ.set(o.question_id, arr);
  }

  return qs.map((x) => ({
    id: x.id,
    type: x.type as PracticeType,
    text: x.text,
    marks: Number(x.marks),
    difficulty: x.difficulty,
    topicName: x.topic_id ? topicName.get(x.topic_id) ?? null : null,
    options: x.type === "mcq" ? optsByQ.get(x.id) : undefined,
  }));
}

