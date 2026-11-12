/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Upload, Import, ListChecks, Database, Clock, CheckCircle, XCircle, AlertCircle, Files } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { getQuestionStudioDashboardData } from "@/lib/documents/admin";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Question Studio" };
export const instant = false;

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-2xl font-extrabold text-ink-800">{value}</span>
        <span className="text-xs font-bold text-ink-400">{label}</span>
      </span>
    </Card>
  );
}

export default async function QuestionStudioPage() {
  await requireAdmin();
  const data = await getQuestionStudioDashboardData();

  const nav = [
    { href: "/admin/questions/upload", label: "Upload documents", icon: Upload, desc: "Add PDF/DOCX/image sources" },
    { href: "/admin/documents", label: "Manage documents", icon: Files, desc: "Extract, preview, retry, delete" },
    { href: "/admin/questions/import", label: "Import JSON", icon: Import, desc: "Prompt, validate, preview, import" },
    { href: "/admin/questions/review", label: "Review queue", icon: ListChecks, desc: "Approve questions & answers" },
    { href: "/admin/questions/bank", label: "Question bank", icon: Database, desc: "Search, edit, export" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <Chip tone="lav">Question Studio</Chip>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-800 sm:text-3xl">Source to reviewed question bank</h1>
        <p className="font-semibold text-ink-400">Upload documents, extract content, import structured JSON, and review before publishing.</p>
      </header>

      {!data ? (
        <EmptyState title="Database not connected" description="Configure Supabase and apply migrations to use Question Studio." />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Documents uploaded" value={data.counts.documents} icon={FileText} tone="text-lav-500 bg-lav-100" />
            <Stat label="Awaiting extraction" value={data.counts.documentsAwaitingExtraction} icon={Clock} tone="text-sun-500 bg-sun-100" />
            <Stat label="Questions extracted" value={data.counts.questionsExtracted} icon={Database} tone="text-mint-600 bg-mint-100" />
            <Stat label="Awaiting review" value={data.counts.questionsAwaitingReview} icon={ListChecks} tone="text-sun-500 bg-sun-100" />
            <Stat label="Approved questions" value={data.counts.questionsApproved} icon={CheckCircle} tone="text-mint-600 bg-mint-100" />
            <Stat label="Rejected questions" value={data.counts.questionsRejected} icon={XCircle} tone="text-red-500 bg-red-100" />
            <Stat label="Answers unverified" value={data.counts.answersUnverified} icon={AlertCircle} tone="text-sun-500 bg-sun-100" />
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="block">
                <Card className="flex h-full items-start gap-3 p-4 transition-colors hover:border-lav-300">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lav-100 text-lav-500"><n.icon className="h-5 w-5" /></span>
                  <span>
                    <span className="block font-extrabold text-ink-800">{n.label}</span>
                    <span className="text-sm font-semibold text-ink-400">{n.desc}</span>
                  </span>
                </Card>
              </Link>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="font-extrabold text-ink-700">Recently uploaded documents</h2>
              {data.recentDocuments.length === 0 ? (
                <p className="mt-2 text-sm text-ink-400">No documents uploaded yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.recentDocuments.map((d: any) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-semibold text-ink-700">{d.original_filename || d.filename}</span>
                      <span className="shrink-0 rounded-full bg-cream-100 px-2 py-0.5 text-xs font-bold text-ink-500">{d.status}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/documents" className="mt-3 inline-block text-sm font-bold text-lav-500 hover:underline">Manage documents →</Link>
            </Card>
            <Card className="p-5">
              <h2 className="font-extrabold text-ink-700">Recent approval activity</h2>
              {data.recentReviews.length === 0 ? (
                <p className="mt-2 text-sm text-ink-400">No review activity yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.recentReviews.map((r: any) => (
                    <li key={r.id} className="text-sm">
                      <span className="font-semibold text-ink-700">{r.action}</span>
                      {r.reason ? <span className="text-ink-400"> — {r.reason}</span> : null}
                      <div className="text-xs text-ink-400">{r.actor_email || "admin"} · {new Date(r.created_at).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/questions/review" className="mt-3 inline-block text-sm font-bold text-lav-500 hover:underline">Open review queue →</Link>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}
