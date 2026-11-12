import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { DocumentUploadForm } from "@/components/questions/DocumentUploadForm";

export const metadata: Metadata = { title: "Upload documents" };
export const instant = false;

export default async function UploadPage() {
  await requireAdmin();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <Chip tone="lav">Question Studio</Chip>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-800">Upload documents</h1>
        <p className="font-semibold text-ink-400">Upload PDF, DOCX, PNG, or JPG sources to private storage. Documents are not published automatically.</p>
      </header>
      <DocumentUploadForm />
      <Card className="p-4 text-sm font-semibold text-ink-500">
        After upload, run extraction from <Link href="/admin/documents" className="text-lav-500 underline">Document management</Link>, then generate an AI prompt and import reviewed JSON.
      </Card>
    </main>
  );
}
