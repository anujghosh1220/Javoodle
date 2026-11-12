/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getQuestionFull } from "@/lib/questions/admin";
import { Chip } from "@/components/ui/Chip";
import { QuestionEditor } from "@/components/questions/QuestionEditor";

export const metadata: Metadata = { title: "Edit question" };
export const instant = false;

export default async function QuestionEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const data = await getQuestionFull(id);
  if (!data.question) notFound();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <Chip tone="lav">Question Studio</Chip>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-800">Edit question</h1>
        <p className="font-semibold text-ink-400">Edits create new versions and audit records. Historical exam snapshots remain unchanged.</p>
      </header>
      <QuestionEditor initial={data as any} />
    </main>
  );
}