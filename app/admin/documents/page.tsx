import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runExtraction, deleteDocument, getDocumentUrl } from "@/app/actions/admin-documents";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Documents" };
export const instant = false;

const TONE: Record<string, "mint" | "sun" | "lav" | "ink"> = {
  extracted: "mint", pending: "sun", extracting: "sun",
  extraction_failed: "lav", needs_manual_review: "lav",
};

export default async function DocumentsPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: docs } = await admin
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-5">
      <AdminNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-800">Documents</h1>
          <p className="font-semibold text-ink-400">{docs?.length ?? 0} uploaded file(s)</p>
        </div>
        <Link href="/admin/questions/upload" className="rounded-full bg-lav-400 px-4 py-2 text-sm font-bold text-white hover:bg-lav-300">Upload</Link>
      </div>

      {!docs?.length ? (
        <EmptyState title="No documents yet" description="Upload ICSE papers (PDF/DOCX) to extract questions." />
      ) : (
        <div className="flex flex-col gap-3">
          {docs.map(async (d) => {
            const url = await getDocumentUrl(d.id);
            const textLen = d.extracted_text?.length ?? 0;
            return (
              <Card key={d.id} className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-extrabold text-ink-700">{d.filename}</p>
                  <Chip tone={TONE[d.extraction_status] ?? "ink"}>{d.extraction_status.replace("_", " ")}</Chip>
                  <span className="text-xs font-semibold text-ink-400">
                    {d.kind} · {d.page_count ? `${d.page_count}p` : ""}
                    {d.source_year ? ` · ${d.source_year}` : ""}
                    {d.source_type ? ` · ${d.source_type}` : ""} · {textLen.toLocaleString()} chars
                  </span>
                </div>
                {d.description && <p className="text-sm font-semibold text-ink-400">{d.description}</p>}
                {d.extraction_meta?.reason && (
                  <p className="rounded-lg bg-sun-50 px-3 py-2 text-xs font-semibold text-ink-500">
                    {String(d.extraction_meta.note ?? d.extraction_meta.reason)}
                  </p>
                )}
                {d.extracted_text && (
                  <details className="rounded-xl bg-cream-100 p-3">
                    <summary className="cursor-pointer text-sm font-bold text-ink-600">View extracted text</summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-ink-500">{d.extracted_text}</pre>
                    <div className="mt-2 flex gap-2">
                      <Link href={`/admin/questions/import?doc=${d.id}`}
                        className="rounded-full bg-mint-300 px-3 py-1 text-xs font-bold text-ink-800 hover:bg-mint-200">
                        Import with AI prompt →
                      </Link>
                    </div>
                  </details>
                )}
                <div className="flex flex-wrap gap-2">
                  <form action={async () => { "use server"; await runExtraction(d.id); }}>
                    <Button size="sm" variant="secondary" type="submit">{d.extracted_text ? "Re-extract" : "Extract"}</Button>
                  </form>
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer"
                      className="rounded-full border-2 border-cream-300 bg-white px-3 py-1 text-xs font-bold text-ink-500 hover:border-lav-300">View original</a>
                  )}
                  <form action={async () => { "use server"; await deleteDocument(d.id); }}>
                    <Button size="sm" variant="ghost" type="submit" className="text-red-400 hover:text-red-500">Delete</Button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
