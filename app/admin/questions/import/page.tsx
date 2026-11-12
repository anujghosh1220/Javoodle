import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { ImportForm } from "@/components/admin/ImportForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Import questions" };
export const instant = false;

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  await requireAdmin();
  const { doc } = await searchParams;

  let extractedText: string | undefined;
  if (doc) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("documents")
      .select("extracted_text")
      .eq("id", doc)
      .maybeSingle();
    extractedText = data?.extracted_text ?? undefined;
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-extrabold text-ink-800">Import structured questions</h1>
        <p className="font-semibold text-ink-400">
          Paste ChatGPT&apos;s JSON output, validate it, then import as pending review.
          Nothing is published automatically.
        </p>
      </div>
      <ImportForm extractedText={extractedText} />
      <Card className="p-4 text-xs font-semibold text-ink-400">
        Expected shape: <code>{'{"questions":[{question_text, question_type, marks, ...}]}'}</code>.
        Types: mcq, fill_blank, true_false, output_prediction, find_error, theory, coding.
        Subquestions are supported via nested <code>subquestions</code>.
      </Card>
    </div>
  );
}
