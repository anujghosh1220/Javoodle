import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";

function ensure() {
  if (!isSupabaseConfigured() || !hasServiceRoleKey()) throw new Error("Supabase not configured");
}

export interface QuestionFilters {
  search?: string;
  topic?: string;
  type?: string;
  difficulty?: string;
  sourceYear?: string;
  sourceDocument?: string;
  questionStatus?: string;
  answerStatus?: string;
  marks?: string;
}

export async function listQuestions(filters: QuestionFilters = {}) {
  ensure();
  const admin = createAdminClient();
  let q = admin
    .from("questions")
    .select("id,text,type,marks,difficulty,source_year,source_document_id,source_page,source_question_number,question_status,answer_status,topic_id,created_at,updated_at,version,parent_question_id,group_key")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (filters.topic) q = q.eq("topic_id", filters.topic);
  if (filters.type) q = q.eq("type", filters.type);
  if (filters.difficulty) q = q.eq("difficulty", Number(filters.difficulty));
  if (filters.sourceYear) q = q.eq("source_year", Number(filters.sourceYear));
  if (filters.sourceDocument) q = q.eq("source_document_id", filters.sourceDocument);
  if (filters.questionStatus) q = q.eq("question_status", filters.questionStatus);
  if (filters.answerStatus) q = q.eq("answer_status", filters.answerStatus);
  if (filters.marks) q = q.eq("marks", Number(filters.marks));
  if (filters.search) q = q.ilike("text", `%${filters.search.replace(/%/g, "")}%`);
  const { data } = await q;
  return data ?? [];
}

export async function getQuestionFull(id: string) {
  ensure();
  const admin = createAdminClient();
  const [{ data: question }, { data: options }, { data: testCases }, { data: rubrics }, { data: versions }, { data: events }] = await Promise.all([
    admin.from("questions").select("*, topics(id,name)").eq("id", id).single(),
    admin.from("question_options").select("*").eq("question_id", id).order("order_index"),
    admin.from("test_cases").select("*").eq("question_id", id).order("order_index"),
    admin.from("marking_rubrics").select("*").eq("question_id", id),
    admin.from("question_versions").select("id,version,created_at").eq("question_id", id).order("version", { ascending: false }),
    admin.from("question_review_events").select("*").eq("question_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  return { question, options: options ?? [], testCases: testCases ?? [], rubrics: rubrics ?? [], versions: versions ?? [], events: events ?? [] };
}

export async function getReviewQueue(limit = 50) {
  ensure();
  const admin = createAdminClient();
  const { data } = await admin
    .from("questions")
    .select("id,text,type,marks,source_document_id,source_page,source_year,source_question_number,question_status,answer_status,provenance,topic_id")
    .in("question_status", ["pending_review", "needs_revision"])
    .order("created_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

