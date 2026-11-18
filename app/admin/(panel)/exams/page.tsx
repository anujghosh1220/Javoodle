import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  ClipboardList,
  Plus,
  FileText,
  Users,
  Clock,
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
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
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
      <Reveal>
        <RevealItem>
          <PageHeader
            icon={ClipboardList}
            chip={<Chip tone="lav">Exam management</Chip>}
            title="Online examinations"
            description="Create papers, publish them, evaluate submissions and release results."
            actions={
              <Link href="/admin/exams/new">
                <Button size="sm"><Plus className="h-4 w-4" /> New exam</Button>
              </Link>
            }
          />
        </RevealItem>

        {!canQuery ? (
          <RevealItem>
            <EmptyState
              title="Database not connected"
              description="Configure Supabase and apply migrations 0001–0004 to manage exams."
            />
          </RevealItem>
        ) : exams.length === 0 ? (
          <RevealItem>
            <EmptyState
              title="No exams yet"
              description="Create your first examination: upload the question paper PDF, define the questions and marks, then publish it for your student."
            >
              <Link href="/admin/exams/new">
                <Button size="sm"><Plus className="h-4 w-4" /> Create exam</Button>
              </Link>
            </EmptyState>
          </RevealItem>
        ) : (
          <>
            <RevealItem className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Drafts", value: draft.length, icon: FileText, tone: "text-ink-500 bg-cream-100" },
                { label: "Published", value: published.length, icon: Eye, tone: "text-mint-600 bg-mint-100" },
                { label: "Active now", value: active.length, icon: Clock, tone: "text-sun-500 bg-sun-100" },
                { label: "Archived", value: completed.length, icon: Archive, tone: "text-ink-500 bg-cream-100" },
                { label: "Attempts", value: totalAttempts, icon: Users, tone: "text-lav-500 bg-lav-100" },
                { label: "Pending eval", value: pendingEval, icon: ClipboardList, tone: "text-sun-500 bg-sun-100" },
              ].map((s) => (
                <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
              ))}
            </RevealItem>

            <RevealItem>
              <Card className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-ink-600">
                  <Eye className="h-4 w-4 text-mint-600" />
                  {publishedResults} result{publishedResults === 1 ? "" : "s"} published
                </div>
                <Link href="/admin/exams/submissions" className="text-sm font-bold text-lav-500 hover:underline">
                  Open submissions inbox →
                </Link>
              </Card>
            </RevealItem>

            <div className="flex flex-col gap-3">
              {exams.map((e) => {
                const live = isExamAvailable(e);
                return (
                  <RevealItem key={e.id}>
                    <Link href={`/admin/exams/${e.id}`} className="block">
                      <Card interactive className="flex flex-wrap items-center justify-between gap-3 p-5">
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
                  </RevealItem>
                );
              })}
            </div>
          </>
        )}

        <RevealItem>
          <p className="text-xs text-ink-400">
            Tip: attempt statuses are{" "}
            {Object.values(ATTEMPT_STATUS_LABELS).join(", ").toLowerCase()}.
          </p>
        </RevealItem>
      </Reveal>
    </main>
  );
}
