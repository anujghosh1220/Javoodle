import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { getStudentSession } from "@/lib/student/session";
import { getLessonForStudent } from "@/lib/learn/data";
import { LessonBlocks } from "@/components/learn/LessonBlocks";
import { CompleteLessonButton } from "@/components/learn/CompleteLessonButton";
import { BackButton } from "@/components/student/BackButton";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Lesson" };
export const instant = false;

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");

  const lesson = await getLessonForStudent(lessonId, session.studentId);
  if (!lesson) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <BackButton href={`/learn/${lesson.topicId}`} label={lesson.topicName} />

      <header>
        <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-ink-400">
          <BookOpen className="h-3.5 w-3.5" /> {lesson.topicName}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-800 sm:text-3xl">
          {lesson.title}
        </h1>
      </header>

      <Card className="p-6 sm:p-8">
        {lesson.blocks.length === 0 ? (
          <p className="text-sm font-semibold text-ink-400">
            This lesson is being written — check back soon.
          </p>
        ) : (
          <LessonBlocks blocks={lesson.blocks} />
        )}
      </Card>

      <CompleteLessonButton
        lessonId={lesson.id}
        completed={lesson.completed}
        nextHref={lesson.nextLessonId ? `/learn/lesson/${lesson.nextLessonId}` : null}
        nextTitle={lesson.nextLessonTitle}
      />

      <nav className="flex items-center justify-between gap-3">
        {lesson.prevLessonId ? (
          <Link href={`/learn/lesson/${lesson.prevLessonId}`} className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-4 py-2 text-sm font-extrabold text-ink-500 transition-colors hover:bg-lav-100 hover:text-lav-600">
            <ChevronLeft className="h-4 w-4" /> Previous lesson
          </Link>
        ) : <span />}
        {lesson.nextLessonId && !lesson.completed ? (
          <Link href={`/learn/lesson/${lesson.nextLessonId}`} className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-4 py-2 text-sm font-extrabold text-ink-500 transition-colors hover:bg-lav-100 hover:text-lav-600">
            Next lesson <ChevronRight className="h-4 w-4" />
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
