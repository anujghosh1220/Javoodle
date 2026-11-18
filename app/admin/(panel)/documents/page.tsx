/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { listDocuments } from "@/lib/documents/admin";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { DocumentsManager } from "@/components/questions/DocumentsManager";
import { Button } from "@/components/ui/Button";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Documents" };
export const instant = false;

export default async function DocumentsPage() {
  await requireAdmin();
  const docs = await listDocuments();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Reveal>
        <RevealItem>
          <PageHeader
            icon={FileText}
            chip={<Chip tone="lav">Question Studio</Chip>}
            title="Documents"
            description="View, extract, preview, retry, and delete uploaded source documents."
            actions={
              <Link href="/admin/questions/upload">
                <Button size="sm">Upload</Button>
              </Link>
            }
          />
        </RevealItem>
        {docs.length === 0 ? (
          <RevealItem>
            <EmptyState title="No documents yet" description="Upload a PDF, DOCX, or image to start extraction.">
              <Link href="/admin/questions/upload" className="mt-2 text-sm font-bold text-lav-500 underline">Upload a document</Link>
            </EmptyState>
          </RevealItem>
        ) : (
          <RevealItem>
            <DocumentsManager initialDocs={docs as any[]} />
          </RevealItem>
        )}
      </Reveal>
    </main>
  );
}

