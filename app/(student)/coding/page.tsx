import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Code2, Clock, Target } from "lucide-react";
import { getStudentSession } from "@/lib/student/session";
import { listPublishedCodingQuestions } from "@/lib/coding/data";
import { DIFFICULTY_LABELS } from "@/lib/coding/shared";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Coding Lab" };
export const instant = false;

const tone: Record<string, "mint" | "sun" | "lav"> = { easy: "mint", medium: "sun", hard: "lav" };

export default async function CodingLabPage() {
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");
  const questions = await listPublishedCodingQuestions();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink-800 sm:text-3xl">
          <Code2 className="h-7 w-7 text-lav-500" /> Coding Lab
        </h1>
        <p className="mt-1 font-semibold text-ink-400">
          Java practice questions — write, run and submit your solutions.
        </p>
      </div>
      {questions.length === 0 ? (
        <EmptyState title="Looks like a fresh notebook! 📓" description="Your coding adventures will appear here soon." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {questions.map((q) => (
            <Link key={q.id} href={`/coding/${q.id}`}>
              <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-lg">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={tone[q.difficulty] ?? "lav"}>{DIFFICULTY_LABELS[q.difficulty]}</Chip>
                  {q.topic && <Chip tone="mint">{q.topic}</Chip>}
                  <Chip tone="ink">{Number(q.marks)} marks</Chip>
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
