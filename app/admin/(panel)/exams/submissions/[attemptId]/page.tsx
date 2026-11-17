import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { getAttemptForEvaluation } from "@/lib/exams/admin-data";
import { EvaluationWorkspace } from "@/components/admin/exams/EvaluationWorkspace";
import { EmptyState } from "@/components/ui/EmptyState";
import { BackButton } from "@/components/student/BackButton";

export const metadata: Metadata = { title: "Evaluate submission" };
export const instant = false;

export default async function EvaluateAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  await connection();
  await requireAdmin();
  const { attemptId } = await params;

  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <BackButton href="/admin/exams/submissions" label="Back to Submissions" />
        <EmptyState title="Database not connected" description="Configure Supabase to evaluate submissions." />
      </main>
    );
  }

  const data = await getAttemptForEvaluation(attemptId);
  if (!data) notFound();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/admin/exams/submissions"
        className="inline-flex w-fit items-center gap-1 text-sm font-bold text-ink-400 hover:text-lav-500"
      >
        <ArrowLeft className="h-4 w-4" /> All submissions
      </Link>
      <EvaluationWorkspace data={data} />
    </main>
  );
}
