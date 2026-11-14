import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Trophy, Target, Percent } from "lucide-react";
import type { StudentAttemptState } from "@/lib/exams/student-data";

export function ResultView({ state }: { state: StudentAttemptState }) {
  const { exam, result, snapshot } = state;
  if (!result) return null;

  const questions = [...(snapshot?.questions ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );
  const evalById = new Map(result.evaluations.map((e) => [e.paper_question_id, e]));

  return (
    <div className="flex flex-col gap-6">
      {/* Score hero */}
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <Trophy className="h-12 w-12 text-sun-500" />
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-ink-400">
            {exam.title} · {exam.subject}
          </p>
          <p className="mt-1 text-4xl font-extrabold text-ink-800">
            {result.total_score}
            <span className="text-xl text-ink-400"> / {result.total_marks}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {result.percentage !== null && (
            <Chip tone="lav">
              <Percent className="h-3.5 w-3.5" /> {result.percentage}%
            </Chip>
          )}
          {result.passing_marks !== null && result.passed !== null && (
            <Chip tone={result.passed ? "mint" : "sun"}>
              <Target className="h-3.5 w-3.5" />
              {result.passed ? "Passed" : "Below passing marks"}
            </Chip>
          )}
        </div>
        {result.passing_marks !== null && (
          <p className="text-xs font-bold text-ink-400">
            Passing marks: {result.passing_marks}
          </p>
        )}
      </Card>

      {/* Question-wise */}
      <Card className="p-6">
        <h2 className="font-extrabold text-ink-700">Question-wise marks</h2>
        <div className="mt-4 flex flex-col gap-4">
          {questions.map((q) => {
            const ev = evalById.get(q.id);
            const awarded = ev?.marks_awarded ?? 0;
            const full = awarded >= Number(q.marks);
            return (
              <div
                key={q.id}
                className="rounded-2xl border-2 border-cream-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-ink-800">Q{q.question_number}</span>
                    <span className="text-xs font-bold text-ink-400">max {q.marks}</span>
                  </div>
                  <Chip tone={full ? "mint" : awarded > 0 ? "sun" : "ink"}>
                    {awarded}/{q.marks}
                  </Chip>
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm font-semibold text-ink-500">
                  {q.prompt}
                </p>
                {ev?.feedback && (
                  <p className="mt-2 rounded-xl bg-lav-50 px-3 py-2 text-sm font-semibold text-ink-600">
                    <span className="font-extrabold text-lav-500">Teacher: </span>
                    {ev.feedback}
                  </p>
                )}
                {q.model_answer && (
                  <div className="mt-2">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-ink-400">
                      Model answer
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-xl bg-mint-50 p-3 font-mono text-xs text-ink-700">
                      {q.model_answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
