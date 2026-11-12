/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { listDocuments } from "@/lib/documents/admin";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentsManager } from "@/components/questions/DocumentsManager";

export const metadata: Metadata = { title: "Documents" };
export const instant = false;

export default async function DocumentsPage() {
  await requireAdmin();
  const docs = await listDocuments();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Chip tone="lav">Question Studio</Chip>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-800">Documents</h1>
          <p className="font-semibold text-ink-400">View, extract, preview, retry, and delete uploaded source documents.</p>
        </div>
        <Link href="/admin/questions/upload" className="rounded-full bg-lav-400 px-4 py-2 text-sm font-bold text-white">Upload</Link>
      </header>
      {docs.length === 0 ? (
        <EmptyState title="No documents yet" description="Upload a PDF, DOCX, or image to start extraction.">
          <Link href="/admin/questions/upload" className="mt-2 text-sm font-bold text-lav-500 underline">Upload a document</Link>
        </EmptyState>
      ) : (
        <DocumentsManager initialDocs={docs as any[]} />
      )}
    </main>
  );
}

