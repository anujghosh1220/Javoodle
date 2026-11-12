/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listDocuments } from "@/lib/documents/admin";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImportStudio } from "@/components/questions/ImportStudio";

export const metadata: Metadata = { title: "Import questions" };
export const instant = false;

export default async function ImportPage() {
  await requireAdmin();
  const docs = await listDocuments();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <Chip tone="lav">Question Studio</Chip>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-800">AI prompt &amp; JSON import</h1>
        <p className="font-semibold text-ink-400">Generate an analysis prompt from extracted content, use ChatGPT manually, then validate and import structured JSON for review.</p>
      </header>
      {docs.length === 0 ? (
        <EmptyState title="No documents available" description="Upload and extract a document first so you can generate a prompt and link imported questions to a source." />
      ) : (
        <ImportStudio documents={docs as any[]} />
      )}
    </main>
  );
}

