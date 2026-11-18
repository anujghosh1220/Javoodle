import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student/session";
import { listLearnTopics, PHASE_LABELS } from "@/lib/learn/data";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { BackButton } from "@/components/student/BackButton";

export const metadata: Metadata = { title: "Learn" };
export const instant = false;

export default async function LearnPage() {
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");
  const topics = await listLearnTopics(session.studentId);
  const withLessons = topics.filter((t) => t.lessonCount > 0);
  const totalLessons = withLessons.reduce((s, t) => s + t.lessonCount, 0);
  const doneLessons = withLessons.reduce((s, t) => s + t.completedCount, 0);

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          icon={BookOpen}
          title="Learn"
          description="Bite-sized Java lessons across the ICSE syllabus — understand it here, practise it everywhere."
        />
      </RevealItem>
      <RevealItem>
        <BackButton href="/dashboard" label="Back to Dashboard" />
      </RevealItem>

      {withLessons.length === 0 ? (
        <RevealItem>
          <EmptyState
            icon={BookOpen}
            title="Lessons are on their way"
            description="Your teacher is preparing the ICSE Computer Applications lessons. Check back soon — your syllabus topics are already mapped out below."
          />
        </RevealItem>
      ) : (
        <RevealItem>
          <Card className="flex items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-ink-700">
                {doneLessons} of {totalLessons} lessons completed
              </p>
              <ProgressBar value={doneLessons} max={Math.max(totalLessons, 1)} className="mt-2" />
            </div>
            <Chip tone="lav">{totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0}%</Chip>
          </Card>
        </RevealItem>
      )}

      {[1, 2, 3].map((phase) => {
        const phaseTopics = withLessons.filter((t) => t.phase === phase);
        if (phaseTopics.length === 0) return null;
        return (
          <RevealItem key={phase}>
            <section>
              <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-ink-400">
                {PHASE_LABELS[phase] ?? `Phase ${phase}`}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {phaseTopics.map((topic) => {
                  const pct = topic.lessonCount > 0 ? Math.round((topic.completedCount / topic.lessonCount) * 100) : 0;
                  const done = topic.completedCount === topic.lessonCount && topic.lessonCount > 0;
                  return (
                    <Link key={topic.id} href={`/learn/${topic.id}`} className="block h-full">
                      <Card interactive className="flex h-full flex-col gap-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-extrabold leading-snug text-ink-800">{topic.name}</h3>
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-mint-500" />
                          ) : (
                            <Circle className="h-5 w-5 shrink-0 text-cream-300" />
                          )}
                        </div>
                        {topic.description && (
                          <p className="text-sm font-semibold text-ink-400">{topic.description}</p>
                        )}
                        <div className="mt-auto">
                          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-ink-400">
                            <span>{topic.completedCount}/{topic.lessonCount} lessons</span>
                            <span>{pct}%</span>
                          </div>
                          <ProgressBar value={topic.completedCount} max={Math.max(topic.lessonCount, 1)} className="h-2" />
                        </div>
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold text-lav-500">
                          {done ? "Review" : topic.completedCount > 0 ? "Continue" : "Start"} <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          </RevealItem>
        );
      })}

      {withLessons.length === 0 && (
        <RevealItem>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-extrabold text-ink-700">
              Your three-month journey
            </h2>
            <ol className="mt-3 space-y-2 text-sm font-semibold text-ink-500">
              <li><span className="text-lav-500">Month 1 —</span> Variables, operators, conditions, loops, classes &amp; methods</li>
              <li><span className="text-mint-500">Month 2 —</span> Constructors, overloading, Strings, arrays, searching &amp; sorting</li>
              <li><span className="text-sun-500">Month 3 —</span> Full revision, previous-year papers &amp; timed mocks</li>
            </ol>
          </Card>
        </RevealItem>
      )}
    </Reveal>
  );
}
