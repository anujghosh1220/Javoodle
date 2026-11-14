import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTION_DOCUMENT_BUCKET } from "@/lib/storage/documents";
import { getExamAdmin } from "@/lib/exams/admin-data";
import { ExamEditor } from "@/components/admin/exams/ExamEditor";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Edit exam" };
export const instant = false;

export default async function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireAdmin();
  const { id } = await params;

  if (!isSupabaseConfigured() || !hasServiceRoleKey()) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <EmptyState title="Database not connected" description="Configure Supabase to edit exams." />
      </main>
    );
  }

  const detail = await getExamAdmin(id);
  if (!detail) notFound();

  // Admin preview of the private paper PDF via short-lived signed URL.
  let paperUrl: string | null = null;
  if (detail.exam.paper_document_id) {
    const admin = createAdminClient();
    const { data: doc } = await admin
      .from("documents")
      .select("storage_bucket,storage_path")
      .eq("id", detail.exam.paper_document_id)
      .maybeSingle();
    if (doc) {
      const d = doc as { storage_bucket?: string; storage_path: string };
      const { data: signed } = await admin.storage
        .from(d.storage_bucket || QUESTION_DOCUMENT_BUCKET)
        .createSignedUrl(d.storage_path, 60 * 15);
      paperUrl = signed?.signedUrl ?? null;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/admin/exams"
        className="inline-flex w-fit items-center gap-1 text-sm font-bold text-ink-400 hover:text-lav-500"
      >
        <ArrowLeft className="h-4 w-4" /> All exams
      </Link>
      <ExamEditor detail={detail} paperUrl={paperUrl} />
    </main>
  );
}
