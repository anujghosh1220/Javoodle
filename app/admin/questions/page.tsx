import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

export const metadata: Metadata = { title: "Question Studio" };
export const instant = false;

async function count(table: string, filters: Record<string, unknown> = {}) {
  const admin = createAdminClient();
  let q = admin.from(table).select("id", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v as never);
  const { count } = await q;
  return count ?? 0;
}

export default async function QuestionsDashboard() {
  await requireAdmin();

  const [
    documents, pendingDocs, totalQuestions, pendingReview, approved,
    rejected, unverifiedAnswers, pendingStatus,
  ] = await Promise.all([
    count("documents"),
    count("documents", { extraction_status: "pending" }),
    count("questions"),
    count("questions", { status: "pending_review" }),
    count("questions", { status: "approved" }),
    count("questions", { status: "rejected" }),
    count("questions", { answer_status: "unverified", status: "approved" }),
    count("questions", { status: "pending" }),
  ]);

  const stats = [
    { label: "Documents", value: documents, href: "/admin/documents", tone: "text-sun-500 bg-sun-100" },
    { label: "Awaiting extraction", value: pendingDocs, href: "/admin/documents", tone: "text-ink-500 bg-cream-100" },
    { label: "Total questions", value: totalQuestions, href: "/admin/questions/bank", tone: "text-lav-500 bg-lav-100" },
    { label: "Pending review", value: pendingReview + pendingStatus, href: "/admin/questions/review", tone: "text-sun-500 bg-sun-100" },
    { label: "Approved", value: approved, href: "/admin/questions/bank?status=approved", tone: "text-mint-600 bg-mint-100" },
    { label: "Rejected", value: rejected, href: "/admin/questions/bank?status=rejected", tone: "text-red-500 bg-red-50" },
    { label: "Approved Q / unverified A", value: unverifiedAnswers, href: "/admin/questions/bank?answer=unverified", tone: "text-ink-500 bg-cream-100" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <AdminNav />
      <div className="flex items-center justify-between">
        <div>
          <Chip tone="lav">Question Studio</Chip>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-800">Studio dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/questions/upload" className="rounded-full bg-lav-400 px-4 py-2 text-sm font-bold text-white hover:bg-lav-300">Upload paper</Link>
          <Link href="/admin/questions/import" className="rounded-full border-2 border-cream-300 bg-white px-4 py-2 text-sm font-bold text-ink-600 hover:border-lav-300">Import JSON</Link>
        </div>
      </div>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="flex flex-col gap-1 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg font-extrabold ${s.tone}`}>{s.value}</span>
              <span className="text-xs font-bold text-ink-400">{s.label}</span>
            </Card>
          </Link>
        ))}
      </section>
      <Card className="p-5 text-sm font-semibold text-ink-400">
        Workflow: upload a paper → extract text → generate the AI prompt →
        import ChatGPT&apos;s JSON → review each question &amp; answer
        independently → approved questions land in the bank.
      </Card>
    </div>
  );
}
