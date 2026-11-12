/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listQuestions } from "@/lib/questions/admin";
import { listDocuments } from "@/lib/documents/admin";
import { getTopicsList } from "@/lib/questions/service";
import { Chip } from "@/components/ui/Chip";
import { QuestionBank } from "@/components/questions/QuestionBank";

export const metadata: Metadata = { title: "Question bank" };
export const instant = false;

export default async function QuestionBankPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const get = (k: string) => typeof sp[k] === "string" ? sp[k] as string : "";
  const filters = {
    search: get("search"), topic: get("topic"), type: get("type"), difficulty: get("difficulty"),
    sourceYear: get("sourceYear"), sourceDocument: get("sourceDocument"),
    questionStatus: get("questionStatus"), answerStatus: get("answerStatus"), marks: get("marks"),
  };
  const [questions, docs, topics] = await Promise.all([listQuestions(filters), listDocuments(), getTopicsList()]);
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <Chip tone="lav">Question Studio</Chip>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-800">Question bank</h1>
        <p className="font-semibold text-ink-400">Search, filter, edit, compare duplicates, view history, and export approved questions.</p>
      </header>
      <QuestionBank initialQuestions={questions as any[]} documents={docs as any[]} topics={topics as any[]} filters={filters} />
    </main>
  );
}
