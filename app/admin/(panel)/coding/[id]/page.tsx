import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getCodingQuestionAdmin } from "@/lib/coding/data";
import { CodingQuestionEditor } from "@/components/admin/coding/CodingQuestionEditor";
import { BackButton } from "@/components/student/BackButton";

export const instant = false;

export const metadata: Metadata = { title: "Edit Coding Question" };

export default async function AdminCodingEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  await requireAdmin();
  const data = await getCodingQuestionAdmin(id);
  if (!data) notFound();
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <BackButton href="/admin/coding" label="Back to Coding Lab" />
      <CodingQuestionEditor question={data.question} testCases={data.testCases} />
    </div>
  );
}
