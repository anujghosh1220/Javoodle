import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  ClipboardList,
  Plus,
  FileText,
  Users,
  Clock,
  CheckCircle,
  Eye,
  Archive,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { listExamsAdmin } from "@/lib/exams/admin-data";
import { isExamAvailable, ATTEMPT_STATUS_LABELS } from "@/lib/exams/shared";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Exam management" };
export const instant = false;

const statusTone: Record<string, "lav" | "mint" | "sun" | "ink"> = {
  draft: "ink",
  published: "mint",
  archived: "ink",
};

export default async function AdminExamsPage() {
  await connection();
  await requireAdmin();
  const canQuery = isSupabaseConfigured() && hasServiceRoleKey();
  const exams = canQuery ? await listExamsAdmin() : [];

  const draft = exams.filter((e) => e.status === "draft");
  const published = exams.filter((e) => e.status === "published");
  const active = published.filter((e) => isExamAvailable(e));
  const completed = exams.filter((e) => e.status === "archived");
  const totalAttempts = exams.reduce((s, e) => s + e.attempts, 0);
  const pendingEval = exams.reduce((s, e) => s + e.pending_evaluations, 0);
  const publishedResults = exams.reduce((s, e) => s + e.published_results, 0);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Chip tone="lav">Exam management</Chip>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-800 sm:text-3xl">
            Online examinations
          </h1>
          <p className="font-semibold text-ink-400">
            Create papers, publish them, evaluate submissions and release results.
          </p>
        </div>
        <Link href="/admin/exams/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> New exam
          </Button>
        </Link>
      </header>

      {!canQuery ? (
        <EmptyState
          title="Database not connected"
          description="Configure Supabase and apply migrations 0001–0004 to manage exams."
        />
      ) : exams.length === 0 ? (
        <EmptyState
          title="No exams yet"
          description="Create your first examination: upload the question paper PDF, define the questions and marks, then publish it for your student."
        >
          <Link href="/admin/exams/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Create exam
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Drafts", value: draft.length, icon: FileText, tone: "text-ink-500 bg-cream-100" },
              { label: "Published", value: published.length, icon: Eye, tone: "text-mint-600 bg-mint-100" },
              { label: "Active now", value: active.length, icon: Clock, tone: "text-sun-500 bg-sun-100" },
              { label: "Archived", value: completed.length, icon: Archive, tone: "text-ink-500 bg-cream-100" },
              { label: "Attempts", value: totalAttempts, icon: Users, tone: "text-lav-500 bg-lav-100" },
              { label: "Pending eval", value: pendingEval, icon: ClipboardList, tone: "text-sun-500 bg-sun-100" },
            ].map((s) => (
              <Card key={s.label} className="flex items-center gap-3 p-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${s.tone}`}>
                  <s.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-2xl font-extrabold text-ink-800">{s.value}</span>
                  <span className="text-xs font-bold text-ink-400">{s.label}</span>
                </span>
              </Card>
            ))}
          </section>

          <Card className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink-600">
              <CheckCircle className="h-4 w-4 text-mint-600" />
              {publishedResults} result{publishedResults === 1 ? "" : "s"} published
            </div>
            <Link href="/admin/exams/submissions" className="text-sm font-bold text-lav-500 hover:underline">
              Open submissions inbox →
            </Link>
          </Card>

          <section className="flex flex-col gap-3">
            {exams.map((e) => {
              const live = isExamAvailable(e);
              return (
                <Link key={e.id} href={`/admin/exams/${e.id}`} className="block">
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:border-lav-300">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-extrabold text-ink-800">{e.title}</h2>
                        <Chip tone={statusTone[e.status] ?? "ink"}>{e.status}</Chip>
                        {e.status === "published" && (
                          <Chip tone={live ? "mint" : "sun"}>
                            {live ? "Available now" : "Outside window"}
                          </Chip>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-ink-400">
                        {e.subject} · {e.class_name} · {e.duration_minutes} min ·{" "}
                        {Number(e.total_marks)} marks
                        {e.passing_marks !== null ? ` · pass ${Number(e.passing_marks)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-sm font-bold text-ink-500">
                      <span>{e.attempts} attempt{e.attempts === 1 ? "" : "s"}</span>
                      <span className="text-sun-500">{e.pending_evaluations} to evaluate</span>
                      <span className="text-mint-600">{e.published_results} published</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </section>
        </>
      )}

      <p className="text-xs text-ink-400">
        Tip: attempt statuses are{" "}
        {Object.values(ATTEMPT_STATUS_LABELS).join(", ").toLowerCase()}.
      </p>
    </main>
  );
}
