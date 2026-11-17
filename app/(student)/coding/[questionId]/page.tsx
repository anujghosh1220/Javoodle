import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/student/BackButton";
import { getStudentSession } from "@/lib/student/session";
import { getCodingQuestionForStudent, getStudentCodingSubmissions, getStudentSubmittedQuestionIds } from "@/lib/coding/data";
import { CodingWorkspace } from "@/components/coding/CodingWorkspace";
import { Robot } from "@/components/mascot/Robot";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Coding Question" };
export const instant = false;

export default async function CodingQuestionPage({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  await connection();
  const session = await getStudentSession();
  if (!session?.studentId) redirect("/");

  const question = await getCodingQuestionForStudent(questionId);
  if (!question) {
    return (
      <div className="flex flex-col gap-6">
        <BackButton href="/coding" label="Back to Coding Lab" />
        <EmptyState title="Question not available" description="This question may be unpublished or may not exist." />
      </div>
    );
  }
  const [submissions, submittedIds] = await Promise.all([
    getStudentCodingSubmissions(session.studentId, questionId),
    getStudentSubmittedQuestionIds(session.studentId),
  ]);
  if (submittedIds.has(questionId)) {
    const mine = submissions[0];
    return (
      <div className="flex flex-col gap-6">
        <BackButton href="/coding" label="Back to Coding Lab" />
        <Card className="mx-auto flex w-full max-w-md flex-col items-center gap-3 p-8 text-center">
          <Robot mood="happy" size={80} />
          <h1 className="text-xl font-extrabold text-ink-800">Challenge complete! 🎉</h1>
          <p className="text-sm font-semibold text-ink-500">
            You already submitted this question{mine?.review_status === "reviewed" ? " and it has been reviewed" : " — your teacher will review it soon"}.
          </p>
          {mine?.marks_awarded != null && (
            <p className="rounded-full bg-sun-100 px-4 py-1.5 text-sm font-extrabold text-sun-600">{mine.marks_awarded} marks awarded</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BackButton href="/coding" label="Back to Coding Lab" />
      <CodingWorkspace question={question} priorSubmissions={submissions as Array<{ id: string; attempt_number: number; review_status: string; marks_awarded: number | null; feedback: string | null; created_at: string }> } />
    </div>
  );
}
