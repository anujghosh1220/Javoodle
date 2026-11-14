import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CodingQuestion, CodingSubmission, CodingTestCase } from "./shared";
import { studentSafeQuestion } from "./shared";

export async function listCodingQuestionsAdmin() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("coding_questions")
    .select("*, coding_question_test_cases(id)")
    .order("created_at", { ascending: false });
  return (data ?? []) as Array<CodingQuestion & { coding_question_test_cases: { id: string }[] }>;
}

export async function getCodingQuestionAdmin(id: string) {
  const admin = createAdminClient();
  const [{ data: q }, { data: cases }] = await Promise.all([
    admin.from("coding_questions").select("*").eq("id", id).maybeSingle(),
    admin.from("coding_question_test_cases").select("*").eq("question_id", id).order("order_index"),
  ]);
  if (!q) return null;
  return { question: q as CodingQuestion, testCases: (cases ?? []) as CodingTestCase[] };
}

export async function listCodingSubmissionsAdmin() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("coding_submissions")
    .select("id,question_id,student_id,attempt_number,review_status,marks_awarded,created_at,coding_questions(title,topic,difficulty),students(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

export async function getCodingSubmissionAdmin(id: string) {
  const admin = createAdminClient();
  const { data: sub0 } = await admin.from("coding_submissions").select("*").eq("id", id).maybeSingle();
  if (!sub0) return null;
  const sub = sub0 as { student_id: string; question_id: string } & Record<string, unknown>;
  const { data: q } = await admin.from("coding_questions").select("id,title,marks").eq("id", sub.question_id).maybeSingle();
  const { data: qRuns } = await admin
    .from("coding_execution_runs")
    .select("id,status,stdout,execution_time_ms,created_at")
    .eq("student_id", (sub as { student_id: string }).student_id)
    .eq("question_id", (sub as { question_id: string }).question_id)
    .order("created_at", { ascending: false })
    .limit(10);
  return { submission: sub as unknown as CodingSubmission, question: q, runs: qRuns ?? [] };
}

export async function listPublishedCodingQuestions() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("coding_questions")
    .select("id,title,description,marks,difficulty,topic,time_recommendation_minutes,status")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  return (data ?? []) as CodingQuestion[];
}

export async function getCodingQuestionForStudent(id: string) {
  const admin = createAdminClient();
  const [{ data: q }, { data: cases }] = await Promise.all([
    admin.from("coding_questions").select("*").eq("id", id).eq("status", "published").maybeSingle(),
    admin.from("coding_question_test_cases").select("*").eq("question_id", id).eq("kind", "sample").order("order_index"),
  ]);
  if (!q) return null;
  return studentSafeQuestion(q as CodingQuestion, (cases ?? []) as CodingTestCase[]);
}

export async function getStudentCodingSubmissions(studentId: string, questionId?: string) {
  const admin = createAdminClient();
  let query = admin
    .from("coding_submissions")
    .select("id,question_id,attempt_number,review_status,marks_awarded,feedback,last_status,created_at,coding_questions(title)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (questionId) query = query.eq("question_id", questionId);
  const { data } = await query;
  return data ?? [];
}
