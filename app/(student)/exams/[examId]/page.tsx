import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Clock, FileText, Target } from "lucide-react";
import { BackButton } from "@/components/student/BackButton";
import { getStudentSession } from "@/lib/student/session";
import { getExamForStudent, getAttemptRefForStudent } from "@/lib/exams/student-data";
import { ExamDetailActions } from "@/components/student/exams/ExamDetailActions";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Exam" };
export const instant = false;

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  await connection();
  const session = await getStudentSession();
  if (!session) redirect("/");

  const detail = session.studentId
    ? await getExamForStudent(examId, session.studentId)
    : null;
  if (!detail) {
    // The exam may be unpublished/closed — but a published result must stay
    // reachable, so fall back to the student's own attempt.
    const ref = session.studentId
      ? await getAttemptRefForStudent(examId, session.studentId)
      : null;
    if (ref && (ref.status === "result_published" || ref.status === "evaluated")) {
      redirect(`/exams/${examId}/result`);
    }
    return (
      <div className="flex flex-col gap-6">
        <BackButton href="/exams" label="Back to Exams" />
        <EmptyState
          title="Exam not available"
          description="This exam may not be published yet, may be outside its availability window, or may not exist."
        />
      </div>
    );
  }

  const { exam, attempt } = detail;
  const totalMinutes = exam.duration_minutes + (exam.reading_time_minutes ?? 0);
  const status = attempt?.status ?? null;

  return (
    <div className="flex flex-col gap-6">
      <BackButton href="/exams" label="Back to Exams" />

      <Card className="flex flex-col gap-5 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="lav">{exam.subject}</Chip>
            <Chip tone="mint">{exam.class_name}</Chip>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-ink-800 sm:text-3xl">{exam.title}</h1>
          {exam.description && (
            <p className="mt-2 font-semibold text-ink-500">{exam.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-cream-50 p-4 text-center">
            <Clock className="mx-auto h-5 w-5 text-lav-500" />
            <p className="mt-1 text-lg font-extrabold text-ink-800">{totalMinutes} min</p>
            <p className="text-xs font-bold text-ink-400">
              {exam.reading_time_minutes ? `${exam.reading_time_minutes} min reading + ${exam.duration_minutes} min writing` : "Duration"}
            </p>
          </div>
          <div className="rounded-2xl bg-cream-50 p-4 text-center">
            <FileText className="mx-auto h-5 w-5 text-mint-600" />
            <p className="mt-1 text-lg font-extrabold text-ink-800">{Number(exam.total_marks)}</p>
            <p className="text-xs font-bold text-ink-400">Total marks</p>
          </div>
          <div className="rounded-2xl bg-cream-50 p-4 text-center">
            <Target className="mx-auto h-5 w-5 text-sun-500" />
            <p className="mt-1 text-lg font-extrabold text-ink-800">
              {exam.passing_marks !== null ? Number(exam.passing_marks) : "—"}
            </p>
            <p className="text-xs font-bold text-ink-400">Passing marks</p>
          </div>
          <div className="rounded-2xl bg-cream-50 p-4 text-center">
            <FileText className="mx-auto h-5 w-5 text-lav-400" />
            <p className="mt-1 text-lg font-extrabold text-ink-800">PDF</p>
            <p className="text-xs font-bold text-ink-400">Question paper included</p>
          </div>
        </div>

        {exam.instructions && (
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-400">Instructions</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-ink-600">
              {exam.instructions}
            </p>
          </div>
        )}

        <ExamDetailActions
          examId={exam.id}
          attemptStatus={status}
          attemptId={attempt?.id ?? null}
          selection={detail.selection}
        />
      </Card>
    </div>
  );
}
