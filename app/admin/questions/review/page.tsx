import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Review queue" };
export const instant = false;

const STATUS_TONE: Record<string, "lav" | "mint" | "sun" | "ink"> = {
  pending_review: "sun", pending: "sun", draft: "ink",
  approved: "mint", rejected: "lav", needs_revision: "lav",
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const admin = createAdminClient();

  let q = admin
    .from("questions")
    .select("id, text, type, marks, status, answer_status, source_year, source_question_number, topics(name)")
    .in("status", ["pending", "pending_review", "needs_revision"])
    .order("created_at", { ascending: true })
    .limit(100);
  if (status === "unverified") q = q.eq("answer_status", "unverified");
  const { data: questions } = await q;

  return (
    <div className="flex flex-col gap-5">
      <AdminNav />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-800">Review queue</h1>
          <p className="font-semibold text-ink-400">
            {questions?.length ?? 0} question(s) awaiting review — oldest first.
          </p>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <Link href="/admin/questions/review" className="rounded-full bg-lav-100 px-3 py-1.5 text-lav-600">All</Link>
          <Link href="/admin/questions/review?status=unverified" className="rounded-full bg-cream-100 px-3 py-1.5 text-ink-500">Unverified answers</Link>
        </div>
      </div>

      {!questions?.length ? (
        <EmptyState title="Queue is clear" description="Import questions via JSON or upload a paper and run the AI workflow — they'll appear here for review." />
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((q) => (
            <Link key={q.id} href={`/admin/questions/${q.id}`}>
              <Card className="flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-lav-300 hover:shadow-lg">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-700">
                    {q.source_question_number ? `${q.source_question_number} · ` : ""}
                    {q.text}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-ink-400">
                    {q.type} · {Number(q.marks)} marks{q.source_year ? ` · ${q.source_year}` : ""}
                    {q.topics ? ` · ${(q.topics as unknown as { name: string }[])[0]?.name ?? (q.topics as unknown as { name: string }).name}` : ""}
                  </p>
                </div>
                <Chip tone={STATUS_TONE[q.status] ?? "ink"}>{q.status.replace("_", " ")}</Chip>
                <Chip tone={q.answer_status === "approved" ? "mint" : "sun"}>
                  answer: {q.answer_status}
                </Chip>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
