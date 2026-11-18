import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Brain } from "lucide-react";
import { getStudentSession } from "@/lib/student/session";
import { getPracticeQuestions, PRACTICE_TYPES, PRACTICE_TYPE_LABELS, type PracticeType } from "@/lib/practice/data";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { EmptyState } from "@/components/ui/EmptyState";
import { BackButton } from "@/components/student/BackButton";
import { Chip } from "@/components/ui/Chip";

export const metadata: Metadata = { title: "Practice session" };
export const instant = false;

const SESSION_SIZE = 10;

export default async function PracticeSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; type?: string }>;
}) {
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");
  const { topic, type } = await searchParams;

  const validType = PRACTICE_TYPES.includes(type as PracticeType) ? (type as PracticeType) : null;
  const topicId = topic && topic !== "all" ? topic : null;

  const questions = await getPracticeQuestions({ topicId, type: validType, limit: SESSION_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <BackButton href="/practice" label="All practice" />
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="lav">{questions.length} question{questions.length === 1 ? "" : "s"}</Chip>
        {validType && <Chip tone="mint">{PRACTICE_TYPE_LABELS[validType]}</Chip>}
        <Chip tone="ink">Instant feedback · explanations included</Chip>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No questions in this set yet"
          description="Try a different topic or the mixed practice set — or check back once your teacher has added more questions."
        />
      ) : (
        <PracticeSession questions={questions} backHref={`/practice/session?topic=${topic ?? "all"}${validType ? `&type=${validType}` : ""}`} />
      )}
    </div>
  );
}
