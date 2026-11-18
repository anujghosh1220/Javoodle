import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { TrendingUp, Zap, BookOpen, Brain, ClipboardList, Code2, Flame, Trophy, Target } from "lucide-react";
import { getStudentSession } from "@/lib/student/session";
import { getGrowthData } from "@/lib/growth/data";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { BackButton } from "@/components/student/BackButton";

export const metadata: Metadata = { title: "My Growth" };
export const instant = false;

export default async function GrowthPage() {
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");
  const g = await getGrowthData(session.studentId);
  const hasData = g.persistent && (g.xp > 0 || g.practiceAttempted > 0 || g.lessonsCompleted > 0 || g.examsTaken > 0 || g.codingSubmissions > 0);

  const maxDay = Math.max(1, ...g.activityDays.map((d) => d.count));

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          icon={TrendingUp}
          title="My Growth"
          description="Your real progress — XP, lessons, practice accuracy, exams and coding. Every number here is yours."
        />
      </RevealItem>
      <RevealItem>
        <BackButton href="/dashboard" label="Back to Dashboard" />
      </RevealItem>

      {!hasData ? (
        <RevealItem>
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
            <EmptyState
              icon={TrendingUp}
              title="Your growth story begins now"
              description="Every lesson, practice answer, exam and program you complete feeds this dashboard — XP, accuracy, milestones and weak spots, all real."
            />
            <Card className="p-6">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-ink-400">How your progress builds</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: BookOpen, label: "Lessons", text: "Finish a lesson → +25 XP and a completion mark.", href: "/learn" },
                  { icon: Target, label: "Practice", text: "Answer questions → accuracy per topic and XP.", href: "/practice" },
                  { icon: ClipboardList, label: "Exams", text: "Sit a paper → scores, averages and trends.", href: "/exams" },
                  { icon: Code2, label: "Coding", text: "Submit solutions → reviewed marks and XP.", href: "/coding" },
                ].map((s) => (
                  <li key={s.label}>
                    <Link href={s.href} className="flex h-full items-start gap-3 rounded-2xl border border-cream-300/50 bg-cream-100/60 p-4 transition-colors hover:border-lav-300/60">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lav-100 text-lav-400"><s.icon className="h-5 w-5" /></span>
                      <span>
                        <span className="block text-sm font-extrabold text-ink-700">{s.label}</span>
                        <span className="block text-xs font-semibold text-ink-400">{s.text}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/learn" className="rounded-full bg-lav-400 px-5 py-2.5 text-sm font-extrabold text-white">Start your first lesson</Link>
              <Link href="/practice" className="rounded-full bg-sun-100 px-5 py-2.5 text-sm font-extrabold text-ink-600">Try practice</Link>
              <Link href="/playground" className="rounded-full bg-mint-100 px-5 py-2.5 text-sm font-extrabold text-mint-600">Open the Playground</Link>
            </div>
          </div>
        </RevealItem>
      ) : (
        <>
          {/* Level + headline stats */}
          <RevealItem>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="flex items-center gap-3 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lav-100 text-lav-500"><Zap className="h-5 w-5" /></span>
                <div>
                  <p className="text-2xl font-extrabold leading-none text-ink-800">Level {g.level}</p>
                  <p className="mt-1 text-xs font-bold text-ink-400">{g.xp} XP total · {g.xpForNextLevel} XP to next level</p>
                </div>
              </Card>
              <StatCard label="Lessons completed" value={g.lessonsCompleted} icon={BookOpen} tone="bg-mint-100 text-mint-500" hint={g.lessonsTotal > 0 ? `of ${g.lessonsTotal} published` : undefined} />
              <StatCard label="Practice accuracy" value={g.practiceAccuracy !== null ? `${g.practiceAccuracy}%` : "—"} icon={Target} tone="bg-sun-100 text-sun-500" hint={`${g.practiceAttempted} attempted`} />
              <StatCard label="Active days" value={g.activeDays} icon={Flame} tone="bg-red-100 text-red-400" hint="days with any activity" />
            </div>
          </RevealItem>

          <RevealItem>
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-extrabold text-ink-800"><Zap className="h-5 w-5 text-lav-400" /> XP progress</h2>
              <div className="mt-3">
                <ProgressBar value={g.xpIntoLevel} max={150} />
                <p className="mt-1.5 text-xs font-bold text-ink-400">{g.xpIntoLevel}/150 XP this level — {g.xpForNextLevel} more to reach Level {g.level + 1}</p>
              </div>
            </Card>
          </RevealItem>

          {/* Activity strip */}
          <RevealItem>
            <Card className="p-5">
              <h2 className="font-extrabold text-ink-800">Last 14 days</h2>
              <div className="mt-4 flex h-24 items-end gap-1.5">
                {g.activityDays.map((d) => (
                  <div key={d.date} className="group flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-md transition-all ${d.count > 0 ? "bg-gradient-to-t from-lav-300 to-mint-300" : "bg-cream-200"}`}
                      style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                      title={`${d.date}: ${d.count} activity`}
                    />
                    <span className="text-[9px] font-bold text-ink-300">{d.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold text-ink-400">Lessons, practice, exams, coding runs and XP — all counted.</p>
            </Card>
          </RevealItem>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Topic strengths */}
            <RevealItem>
              <Card className="h-full p-5">
                <h2 className="flex items-center gap-2 font-extrabold text-ink-800"><Brain className="h-5 w-5 text-sun-400" /> Practice by topic</h2>
                {g.topicStats.length === 0 ? (
                  <p className="mt-3 text-sm font-semibold text-ink-400">No practice attempts yet — <Link href="/practice" className="font-extrabold text-lav-500">start a set</Link>.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-3">
                    {g.topicStats.map((t) => (
                      <li key={t.topicName}>
                        <div className="mb-1 flex items-center justify-between text-xs font-bold">
                          <span className="text-ink-600">{t.topicName}</span>
                          <span className={t.accuracy !== null && t.accuracy >= 70 ? "text-mint-600" : t.accuracy !== null && t.accuracy < 50 ? "text-red-400" : "text-ink-400"}>
                            {t.correct}/{t.attempted} · {t.accuracy}%
                          </span>
                        </div>
                        <ProgressBar value={t.correct} max={Math.max(t.attempted, 1)} className="h-2" />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </RevealItem>

            {/* Exams + coding */}
            <RevealItem>
              <Card className="h-full p-5">
                <h2 className="flex items-center gap-2 font-extrabold text-ink-800"><ClipboardList className="h-5 w-5 text-lav-400" /> Exams & coding</h2>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-cream-100 p-3">
                    <p className="text-xl font-extrabold text-ink-800">{g.examsTaken}</p>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-400">Exams sat</p>
                  </div>
                  <div className="rounded-2xl bg-cream-100 p-3">
                    <p className="text-xl font-extrabold text-ink-800">{g.examsAvgPercent !== null ? `${g.examsAvgPercent}%` : "—"}</p>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-400">Avg score</p>
                  </div>
                  <div className="rounded-2xl bg-cream-100 p-3">
                    <p className="text-xl font-extrabold text-ink-800">{g.codingSubmissions}</p>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-400">Code submitted</p>
                  </div>
                </div>
                {g.recentResults.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {g.recentResults.map((r, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl bg-cream-100 px-3 py-2 text-xs font-bold text-ink-500">
                        <span className="truncate">{r.title}</span>
                        <span className="shrink-0 text-ink-400">
                          {r.score !== null ? `${r.score}/${r.max ?? "?"}` : r.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {g.codingPending > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-ink-400">
                    <Code2 className="h-3.5 w-3.5" /> {g.codingPending} coding submission{g.codingPending === 1 ? "" : "s"} awaiting teacher review.
                  </p>
                )}
              </Card>
            </RevealItem>
          </div>

          {/* Milestones */}
          <RevealItem>
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-extrabold text-ink-800"><Trophy className="h-5 w-5 text-sun-400" /> Milestones</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {g.milestones.map((m) => (
                  <div key={m.label} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold ${m.achieved ? "bg-mint-50 text-mint-600" : "bg-cream-100 text-ink-300"}`}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${m.achieved ? "bg-mint-300 text-ink-800" : "bg-cream-200 text-ink-300"}`}>
                      {m.achieved ? "✓" : "·"}
                    </span>
                    {m.label}
                  </div>
                ))}
              </div>
            </Card>
          </RevealItem>
        </>
      )}
    </Reveal>
  );
}
