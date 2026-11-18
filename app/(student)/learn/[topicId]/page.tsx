import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { BookOpen, CheckCircle2, ChevronRight, Circle, PlayCircle } from "lucide-react";
import { getStudentSession } from "@/lib/student/session";
import { getTopicLessons, listLearnTopics } from "@/lib/learn/data";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BackButton } from "@/components/student/BackButton";

export const metadata: Metadata = { title: "Topic" };
export const instant = false;

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");

  const topics = await listLearnTopics(session.studentId);
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) notFound();

  const lessons = await getTopicLessons(topicId, session.studentId);
  const done = lessons.filter((l) => l.completed).length;
  const nextUnfinished = lessons.find((l) => !l.completed);

  return (
    <div className="flex flex-col gap-6">
      <BackButton href="/learn" label="All topics" />
      <PageHeader
        icon={BookOpen}
        title={topic.name}
        description={topic.description ?? "Work through the lessons in order — each one builds on the last."}
        actions={
          nextUnfinished ? (
            <Link href={`/learn/lesson/${nextUnfinished.id}`}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lav-400 px-5 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_var(--color-lav-600)] transition-all hover:bg-lav-300 active:translate-y-0.5 active:shadow-none">
                <PlayCircle className="h-4 w-4" /> {done > 0 ? "Continue" : "Start lesson"}
              </span>
            </Link>
          ) : undefined
        }
      />

      <Card className="flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink-700">{done}/{lessons.length} lessons completed</p>
          <ProgressBar value={done} max={Math.max(lessons.length, 1)} className="mt-2" />
        </div>
        <Chip tone={done === lessons.length && lessons.length > 0 ? "mint" : "lav"}>
          {lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0}%
        </Chip>
      </Card>

      {lessons.length === 0 ? (
        <EmptyState icon={BookOpen} title="No lessons yet" description="This topic's lessons are being prepared by your teacher." />
      ) : (
        <ol className="flex flex-col gap-3">
          {lessons.map((lesson, i) => (
            <li key={lesson.id}>
              <Link href={`/learn/lesson/${lesson.id}`} className="block">
                <Card interactive className="flex items-center gap-4 p-4">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${
                      lesson.completed ? "bg-mint-100 text-mint-600" : "bg-lav-100 text-lav-500"
                    }`}
                  >
                    {lesson.completed ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-extrabold ${lesson.completed ? "text-ink-500" : "text-ink-800"}`}>
                      {lesson.title}
                    </p>
                    <p className="text-xs font-bold text-ink-400">
                      {lesson.completed ? "Completed — review anytime" : i === lessons.findIndex((l) => !l.completed) ? "Up next" : "Not started"}
                    </p>
                  </div>
                  {lesson.completed ? <Circle className="h-4 w-4 text-mint-400" /> : <ChevronRight className="h-4 w-4 text-ink-300" />}
                </Card>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
