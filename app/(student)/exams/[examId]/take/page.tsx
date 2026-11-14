import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/student/BackButton";
import { getStudentSession } from "@/lib/student/session";
import { getAttemptRefForStudent, getAttemptForStudent } from "@/lib/exams/student-data";
import { ExamRunner } from "@/components/student/exams/ExamRunner";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Take exam" };
export const instant = false;

export default async function TakeExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  await connection();
  const session = await getStudentSession();
  if (!session?.studentId) redirect("/");

  // In-progress attempts stay resumable even if the exam was unpublished or
  // its window closed after the student started — the attempt snapshot and
  // deadline are already frozen server-side.
  const attemptRef = await getAttemptRefForStudent(examId, session.studentId);
  const attemptId = attemptRef?.id ?? null;

  if (!attemptId || attemptRef?.status !== "in_progress") {
    return (
      <div className="flex flex-col gap-6">
        <BackButton href={`/exams/${examId}`} label="Back to Exam" />
        <EmptyState
          title="No exam in progress"
          description="Start the exam from its details page first. If you already submitted, your result will appear there once published."
        />
      </div>
    );
  }

  const state = await getAttemptForStudent(attemptId, session.studentId);
  if (!state || state.attempt.status !== "in_progress" || !state.attempt.deadline_at) {
    redirect(`/exams/${examId}`);
  }

  // Optional questions the student did not select are not part of the attempt.
  const selected = new Set(state.selectedQuestionIds);
  const hasGroups = (state.snapshot?.optional_groups ?? []).length > 0;
  const visibleQuestions = hasGroups
    ? (state.snapshot?.questions ?? []).filter(
        (q) => !q.optional_group_id || selected.has(q.id)
      )
    : state.snapshot?.questions ?? [];

  return (
    <ExamRunner
      attemptId={state.attempt.id}
      deadlineAt={state.attempt.deadline_at}
      serverNow={new Date().toISOString()}
      examTitle={state.exam.title}
      totalMarks={state.exam.total_marks}
      paperSignedUrl={state.paperSignedUrl}
      sections={state.snapshot?.sections ?? []}
      questions={visibleQuestions}
      initialAnswers={state.answers}
    />
  );
}
