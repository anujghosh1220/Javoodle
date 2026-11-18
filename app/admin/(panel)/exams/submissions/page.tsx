import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ClipboardList, ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/env";
import { listSubmissions, listExamsAdmin } from "@/lib/exams/admin-data";
import { ATTEMPT_STATUS_LABELS, type AttemptStatus } from "@/lib/exams/shared";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { Select } from "@/components/ui/Field";

export const metadata: Metadata = { title: "Submissions" };
export const instant = false;

const statusTone: Record<string, "lav" | "mint" | "sun" | "ink"> = {
  in_progress: "ink",
  submitted: "sun",
  under_evaluation: "lav",
  evaluation_completed: "mint",
  result_published: "mint",
  evaluated: "mint",
};

function timeTaken(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.max(0, Math.round(ms / 60000));
  return `${mins} min`;
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string; status?: string }>;
}) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const canQuery = isSupabaseConfigured() && hasServiceRoleKey();
  const [submissions, exams] = canQuery
    ? await Promise.all([
        listSubmissions({ examId: sp.exam || undefined, status: sp.status || undefined }),
        listExamsAdmin(),
      ])
    : [[], []];

  const statuses: AttemptStatus[] = [
    "submitted",
    "under_evaluation",
    "evaluation_completed",
    "result_published",
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Reveal>
        <RevealItem>
          <PageHeader
            icon={ClipboardList}
            chip={<Chip tone="lav">Submissions</Chip>}
            title="Answer scripts to evaluate"
            description="Open a submission, award marks question by question, then publish the result."
            actions={
              <Link
                href="/admin/exams"
                className="inline-flex items-center gap-1 text-sm font-bold text-ink-400 hover:text-lav-500"
              >
                <ArrowLeft className="h-4 w-4" /> Exams
              </Link>
            }
          />
        </RevealItem>

        {/* Filters */}
        <RevealItem>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <form method="get" className="flex flex-wrap items-center gap-3">
              <Select name="exam" defaultValue={sp.exam ?? ""} className="w-auto">
                <option value="">All exams</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </Select>
              <Select name="status" defaultValue={sp.status ?? ""} className="w-auto">
                <option value="">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{ATTEMPT_STATUS_LABELS[s]}</option>
                ))}
              </Select>
              <button
                type="submit"
                className="rounded-full bg-lav-400 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-lav-300"
              >
                Filter
              </button>
              {(sp.exam || sp.status) && (
                <Link href="/admin/exams/submissions" className="text-sm font-bold text-ink-400 hover:text-lav-500">
                  Clear
                </Link>
              )}
            </form>
          </Card>
        </RevealItem>

        {submissions.length === 0 ? (
          <RevealItem>
            <EmptyState
              title="No submissions yet"
              description="When a student submits an exam, the attempt will appear here for manual evaluation."
            />
          </RevealItem>
        ) : (
          <div className="flex flex-col gap-3">
            {submissions.map((s) => (
              <RevealItem key={s.attempt_id}>
                <Link href={`/admin/exams/submissions/${s.attempt_id}`} className="block">
                  <Card interactive className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-extrabold text-ink-800">{s.student_name}</h2>
                        <Chip tone={statusTone[s.status] ?? "ink"}>
                          {ATTEMPT_STATUS_LABELS[s.status] ?? s.status}
                        </Chip>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-ink-400">
                        {s.exam_title} · started {new Date(s.started_at).toLocaleString()}
                        {s.submitted_at ? ` · submitted ${new Date(s.submitted_at).toLocaleString()}` : ""}
                        {s.submitted_at ? ` · took ${timeTaken(s.started_at, s.submitted_at)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-sm font-bold">
                      {s.total_score !== null && s.total_marks !== null ? (
                        <span className="text-ink-700">
                          {s.total_score}/{s.total_marks}
                          {s.percentage !== null ? ` (${s.percentage}%)` : ""}
                        </span>
                      ) : (
                        <span className="text-ink-400">Not evaluated</span>
                      )}
                      <ClipboardList className="h-4 w-4 text-lav-400" />
                    </div>
                  </Card>
                </Link>
              </RevealItem>
            ))}
          </div>
        )}
      </Reveal>
    </main>
  );
}
