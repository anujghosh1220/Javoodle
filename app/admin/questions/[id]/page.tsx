import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDocumentUrl } from "@/app/actions/admin-documents";
import { AdminNav } from "@/components/admin/AdminNav";
import { QuestionEditor } from "@/components/admin/QuestionEditor";

export const metadata: Metadata = { title: "Review question" };
export const instant = false;

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: q } = await admin
    .from("questions")
    .select("*, topics(name), documents(filename, source_year, source_type)")
    .eq("id", id)
    .maybeSingle();
  if (!q) notFound();

  const [optionsRes, casesRes, rubricsRes, versionsRes, eventsRes] =
    await Promise.all([
      admin.from("question_options").select("*").eq("question_id", id).order("order_index"),
      admin.from("test_cases").select("*").eq("question_id", id).order("order_index"),
      admin.from("marking_rubrics").select("*").eq("question_id", id),
      admin.from("question_versions").select("version, created_at").eq("question_id", id).order("version", { ascending: false }).limit(10),
      admin.from("question_review_events").select("event, actor, created_at, payload").eq("question_id", id).order("created_at", { ascending: false }).limit(20),
    ]);

  const docId = (q as { source_document_id?: string }).source_document_id;
  const docUrl = docId ? await getDocumentUrl(docId) : null;
  const doc = (q as { documents?: { filename: string } | null }).documents;

  return (
    <div className="flex flex-col gap-5">
      <AdminNav />
      <QuestionEditor
        question={{
          id: q.id, text: q.text, type: q.type, marks: Number(q.marks),
          difficulty: q.difficulty, status: q.status, answer_status: q.answer_status,
          correct_answer_text: q.correct_answer_text, explanation: q.explanation,
          ai_metadata: q.ai_metadata, source_question_number: q.source_question_number,
          source_page: q.source_page, source_year: q.source_year, version: q.version,
          topic_id: q.topic_id, topic_name: (q as { topics?: { name: string } }).topics?.name ?? null,
        }}
        options={optionsRes.data ?? []}
        testCases={casesRes.data ?? []}
        rubrics={rubricsRes.data ?? []}
        versions={versionsRes.data ?? []}
        events={eventsRes.data ?? []}
        sourceDoc={doc ? { filename: doc.filename, url: docUrl } : null}
      />
    </div>
  );
}
