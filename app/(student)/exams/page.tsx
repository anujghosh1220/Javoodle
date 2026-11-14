import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ClipboardList, Clock, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { getStudentSession } from "@/lib/student/session";
import { listExamsForStudent } from "@/lib/exams/student-data";
import { ATTEMPT_STATUS_LABELS } from "@/lib/exams/shared";

export const metadata: Metadata = { title: "Mock Exams" };
export const instant = false;

const statusTone: Record<string, "lav" | "mint" | "sun" | "ink"> = {
  in_progress: "sun",
  submitted: "lav",
  under_evaluation: "lav",
  evaluation_completed: "mint",
  result_published: "mint",
  evaluated: "mint",
};

export default async function ExamsPage() {
  await connection();
  const session = await getStudentSession();
  const exams = session?.studentId ? await listExamsForStudent(session.studentId) : [];

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-lav-500">
          <ClipboardList className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold text-ink-800 sm:text-3xl">Examinations</h1>
        </div>
        <p className="font-semibold text-ink-400">
          Your online exams will appear here when your teacher publishes them.
        </p>
      </header>

      {exams.length === 0 ? (
        <EmptyState
          title="Nothing on the exam calendar yet 🌱"
          description="Your next challenge is on its way — check back soon!"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {exams.map((e) => (
            <Link key={e.id} href={`/exams/${e.id}`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:border-lav-300">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-extrabold text-ink-800">{e.title}</h2>
                    {e.attempt_status && (
                      <Chip tone={statusTone[e.attempt_status] ?? "ink"}>
                        {ATTEMPT_STATUS_LABELS[e.attempt_status]}
                      </Chip>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink-400">
                    {e.subject} · {e.class_name}
                  </p>
                  {e.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-400">{e.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-sm font-bold text-ink-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-lav-400" />
                    {e.duration_minutes + (e.reading_time_minutes ?? 0)} min
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-mint-500" />
                    {Number(e.total_marks)} marks
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
