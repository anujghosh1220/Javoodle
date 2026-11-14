import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { ExamCreateForm } from "@/components/admin/exams/ExamCreateForm";

export const metadata: Metadata = { title: "New exam" };
export const instant = false;

export default async function NewExamPage() {
  await connection();
  await requireAdmin();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <ExamCreateForm />
    </main>
  );
}
