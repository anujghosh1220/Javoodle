import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Code2, Clock, Target, CheckCircle2 } from "lucide-react";
import { getStudentSession } from "@/lib/student/session";
import { listPublishedCodingQuestions, getStudentSubmittedQuestionIds } from "@/lib/coding/data";
import { DIFFICULTY_LABELS } from "@/lib/coding/shared";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal, RevealItem } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Coding Lab" };
export const instant = false;

const tone: Record<string, "mint" | "sun" | "lav"> = { easy: "mint", medium: "sun", hard: "lav" };

export default async function CodingLabPage() {
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");
  const [questions, submittedIds] = await Promise.all([
    listPublishedCodingQuestions(),
    session.studentId ? getStudentSubmittedQuestionIds(session.studentId) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          icon={Code2}
          title="Coding Lab"
          description="Java practice questions — write, run and submit your solutions."
        />
      </RevealItem>
      {questions.length === 0 ? (
        <RevealItem>
          <EmptyState icon={Code2} title="Looks like a fresh notebook" description="Your coding adventures will appear here soon." />
        </RevealItem>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {questions.map((q) => {
            const submitted = submittedIds.has(q.id);
            const card = (
              <Card className={`flex h-full flex-col gap-3 p-5 transition-all ${submitted ? "opacity-60" : "hover:-translate-y-0.5 hover:border-mint-300/60 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55)]"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={tone[q.difficulty] ?? "lav"}>{DIFFICULTY_LABELS[q.difficulty]}</Chip>
                  {q.topic && <Chip tone="mint">{q.topic}</Chip>}
                  <Chip tone="ink">{Number(q.marks)} marks</Chip>
                  {submitted && <Chip tone="mint"><CheckCircle2 className="h-3 w-3" /> Submitted</Chip>}
                </div>
                <h2 className="text-lg font-extrabold text-ink-800">{q.title}</h2>
                {q.description && <p className="line-clamp-2 text-sm font-semibold text-ink-500">{q.description}</p>}
                <div className="mt-auto flex items-center gap-3 text-xs font-bold text-ink-400">
                  {q.time_recommendation_minutes && (
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{q.time_recommendation_minutes} min</span>
                  )}
                  <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> Java</span>
                </div>
              </Card>
            );
            return submitted ? (
              <RevealItem key={q.id} className="cursor-not-allowed" >
                <div title="Already submitted">{card}</div>
              </RevealItem>
            ) : (
              <RevealItem key={q.id}>
                <Link href={`/coding/${q.id}`} className="block h-full">{card}</Link>
              </RevealItem>
            );
          })}
        </div>
      )}
    </Reveal>
  );
}
