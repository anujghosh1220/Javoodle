import type { Metadata } from "next";
import Link from "next/link";
import { Brain, ChevronRight, Target, Layers } from "lucide-react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student/session";
import { listPracticeTopics } from "@/lib/practice/data";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { BackButton } from "@/components/student/BackButton";

export const metadata: Metadata = { title: "Practice" };
export const instant = false;

export default async function PracticePage() {
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");
  const topics = await listPracticeTopics(session.studentId);
  const totalQ = topics.reduce((s, t) => s + t.questionCount, 0);
  const totalAttempted = topics.reduce((s, t) => s + t.attempted, 0);
  const totalCorrect = topics.reduce((s, t) => s + t.correct, 0);
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null;

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          icon={Brain}
          title="Practice"
          description="Unlimited attempts, instant feedback and real explanations — train the concepts you just learned."
        />
      </RevealItem>
      <RevealItem>
        <BackButton href="/dashboard" label="Back to Dashboard" />
      </RevealItem>

      {topics.length === 0 ? (
        <RevealItem>
          <EmptyState
            icon={Brain}
            title="Question bank is being prepared"
            description="Your teacher is adding MCQs, output puzzles, error-spotting and theory drills. Meanwhile, the Coding Lab has 30+ Java challenges ready to solve."
          >
            <Link
              href="/coding"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-mint-300 px-5 py-2 text-sm font-extrabold text-ink-800 transition-all hover:bg-mint-200"
            >
              <Target className="h-4 w-4" /> Open Coding Lab
            </Link>
          </EmptyState>
        </RevealItem>
      ) : (
        <>
          <RevealItem>
            <Card className="flex flex-wrap items-center gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lav-100 text-lav-500">
                <Layers className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-ink-700">
                  {totalQ} practice questions across {topics.length} topic{topics.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs font-bold text-ink-400">
                  {totalAttempted > 0
                    ? `${totalAttempted} attempted · ${accuracy}% accuracy`
                    : "Pick a topic and start your first set — 10 questions at a time."}
                </p>
              </div>
              <Link
                href="/practice/session?topic=all"
                className="inline-flex items-center gap-1.5 rounded-full bg-lav-400 px-5 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_var(--color-lav-600)] transition-all hover:bg-lav-300 active:translate-y-0.5 active:shadow-none"
              >
                Mixed practice <ChevronRight className="h-4 w-4" />
              </Link>
            </Card>
          </RevealItem>

          <RevealItem>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {topics.map((t) => {
                const acc = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : null;
                return (
                  <Link key={t.topicId} href={`/practice/session?topic=${t.topicId}`} className="block h-full">
                    <Card interactive className="flex h-full flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-extrabold leading-snug text-ink-800">{t.topicName}</h3>
                        <Chip tone="ink">{t.questionCount} Qs</Chip>
                      </div>
                      {t.attempted > 0 ? (
                        <>
                          <ProgressBar value={t.correct} max={Math.max(t.attempted, 1)} className="h-2" />
                          <p className="text-xs font-bold text-ink-400">
                            {t.correct}/{t.attempted} correct · {acc}% accuracy
                          </p>
                        </>
                      ) : (
                        <p className="text-xs font-bold text-ink-400">Not attempted yet — start a set of 10.</p>
                      )}
                      <span className="mt-auto inline-flex items-center gap-1 text-xs font-extrabold text-lav-500">
                        Practice now <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </RevealItem>
        </>
      )}
    </Reveal>
  );
}
