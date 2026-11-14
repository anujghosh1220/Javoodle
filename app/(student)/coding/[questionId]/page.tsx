import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/student/BackButton";
import { getStudentSession } from "@/lib/student/session";
import { getCodingQuestionForStudent, getStudentCodingSubmissions } from "@/lib/coding/data";
import { CodingWorkspace } from "@/components/coding/CodingWorkspace";
import { EmptyState } from "@/components/ui/EmptyState";

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
  const submissions = await getStudentCodingSubmissions(session.studentId, questionId);

  return (
    <div className="flex flex-col gap-4">
      <BackButton href="/coding" label="Back to Coding Lab" />
      <CodingWorkspace question={question} priorSubmissions={submissions as Array<{ id: string; attempt_number: number; review_status: string; marks_awarded: number | null; feedback: string | null; created_at: string }> } />
    </div>
  );
}
