import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/student/BackButton";
import { Trophy } from "lucide-react";
import { getStudentSession } from "@/lib/student/session";
import { getAttemptRefForStudent, getAttemptForStudent } from "@/lib/exams/student-data";
import { ResultView } from "@/components/student/exams/ResultView";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Exam result" };
export const instant = false;

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  await connection();
  const session = await getStudentSession();
  if (!session?.studentId) redirect("/");

  const attemptRef = await getAttemptRefForStudent(examId, session.studentId);
  const attemptId = attemptRef?.id ?? null;

  if (!attemptId) {
    return (
      <div className="flex flex-col gap-6">
        <BackButton href="/exams" label="Back to Exams" />
        <EmptyState icon={Trophy} title="Exam not found" />
      </div>
    );
  }

  const state = await getAttemptForStudent(attemptId, session.studentId);
  const published =
    state?.attempt.status === "result_published" || state?.attempt.status === "evaluated";

  if (!state || !published || !state.result) {
    return (
      <div className="flex flex-col gap-6">
        <BackButton href={`/exams/${examId}`} label="Back to Exam" />
        <EmptyState
          icon={Trophy}
          title="Result not published yet"
          description="Your teacher is still evaluating your answers. Check back soon — this page updates automatically once the result is published."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackButton href="/exams" label="Back to Exams" />
      <ResultView state={state} />
    </div>
  );
}
