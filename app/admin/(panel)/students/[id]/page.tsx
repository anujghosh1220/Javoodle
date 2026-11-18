import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, Users, BookOpen, ClipboardList, PenLine, Trophy, Clock } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { getStudentDetail } from "@/lib/admin/students";
import { DeleteStudentButton } from "@/components/admin/students/DeleteStudentButton";
import { ATTEMPT_STATUS_LABELS, type AttemptStatus } from "@/lib/exams/shared";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Reveal, RevealItem } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Student" };
export const instant = false;

const statusTone: Record<string, "lav" | "mint" | "sun" | "ink"> = {
  in_progress: "ink",
  submitted: "sun",
  under_evaluation: "lav",
  evaluation_completed: "mint",
  result_published: "mint",
  evaluated: "mint",
};

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireAdmin();
  const { id } = await params;
  const s = await getStudentDetail(id);
  if (!s) notFound();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Reveal>
        <RevealItem>
          <PageHeader
            icon={Users}
            chip={<Chip tone="lav">Student</Chip>}
            title={s.name}
            description={
              <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Registered {fmtDateTime(s.registeredAt)}</span>
                <span>Last active {s.lastActivityAt ? fmtDateTime(s.lastActivityAt) : "never"}</span>
                <span>Email not collected</span>
              </span>
            }
            actions={
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/students"
                  className="inline-flex items-center gap-1 text-sm font-bold text-ink-400 hover:text-lav-500"
                >
                  <ArrowLeft className="h-4 w-4" /> Directory
                </Link>
                <DeleteStudentButton studentId={s.id} studentName={s.name} />
              </div>
            }
          />
        </RevealItem>

        <RevealItem>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Lessons" value={s.lessonsCompleted} icon={BookOpen} tone="bg-lav-100 text-lav-500" />
            <StatCard label="Exams" value={s.examsAttempted} icon={ClipboardList} tone="bg-mint-100 text-mint-600" />
            <StatCard label="Results" value={s.publishedResults} icon={Trophy} tone="bg-sun-100 text-sun-600" />
            <StatCard label="Practice" value={s.practiceAnswers} icon={PenLine} tone="bg-cream-200 text-ink-500" />
            <StatCard label="XP" value={s.xp} icon={Trophy} tone="bg-lav-100 text-lav-500" />
            <StatCard label="Active" value={s.lastActivityAt ? "Yes" : "No"} icon={Clock} tone="bg-mint-100 text-mint-600" />
          </div>
        </RevealItem>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent lessons */}
          <RevealItem>
            <Card className="flex h-full flex-col gap-3 p-5">
              <h2 className="text-base font-extrabold text-ink-800">Recent lessons</h2>
              {s.recentLessons.length === 0 ? (
                <p className="text-sm font-semibold text-ink-400">No lessons completed yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {s.recentLessons.map((l, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-cream-100/60 px-3 py-2">
                      <span className="min-w-0 truncate text-sm font-bold text-ink-700">{l.title}</span>
                      <span className="shrink-0 text-xs font-semibold text-ink-400">{fmtDateTime(l.completedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </RevealItem>

          {/* Recent exam attempts */}
          <RevealItem>
            <Card className="flex h-full flex-col gap-3 p-5">
              <h2 className="text-base font-extrabold text-ink-800">Recent exam attempts</h2>
              {s.recentAttempts.length === 0 ? (
                <p className="text-sm font-semibold text-ink-400">No exam attempts yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {s.recentAttempts.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-cream-100/60 px-3 py-2">
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-bold text-ink-700">{a.examTitle}</span>
                        <span className="text-xs font-semibold text-ink-400">{fmtDateTime(a.startedAt)}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {a.score !== null && a.total !== null && (
                          <span className="text-sm font-extrabold text-ink-700">{a.score}/{a.total}</span>
                        )}
                        <Chip tone={statusTone[a.status] ?? "ink"}>
                          {ATTEMPT_STATUS_LABELS[a.status as AttemptStatus] ?? a.status}
                        </Chip>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </RevealItem>

          {/* Recent practice */}
          <RevealItem>
            <Card className="flex h-full flex-col gap-3 p-5">
              <h2 className="text-base font-extrabold text-ink-800">Recent practice</h2>
              {s.recentPractice.length === 0 ? (
                <p className="text-sm font-semibold text-ink-400">No practice activity yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {s.recentPractice.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-cream-100/60 px-3 py-2">
                      <span className="min-w-0 truncate text-sm font-bold text-ink-700">
                        {p.questionText.length > 80 ? `${p.questionText.slice(0, 80)}…` : p.questionText}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {p.correct !== null && (
                          <Chip tone={p.correct ? "mint" : "sun"}>{p.correct ? "Correct" : "Wrong"}</Chip>
                        )}
                        <span className="text-xs font-semibold text-ink-400">{fmtDateTime(p.createdAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </RevealItem>
        </div>
      </Reveal>
    </main>
  );
}
