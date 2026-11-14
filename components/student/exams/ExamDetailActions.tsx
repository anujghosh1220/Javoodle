"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { startExamAction } from "@/app/actions/exam-student";
import type { AttemptStatus } from "@/lib/exams/shared";
import { Play, RotateCcw, ClipboardCheck } from "lucide-react";

export function ExamDetailActions({
  examId,
  attemptStatus,
  attemptId,
  selection,
}: {
  examId: string;
  attemptStatus: AttemptStatus | null;
  attemptId: string | null;
  selection?: {
    groups: Array<{ id: string; title: string; pick_count: number; max_counted_marks: number }>;
    questions: Array<{
      id: string;
      optional_group_id: string | null;
      question_number: string;
      prompt: string;
      marks: number;
    }>;
  } | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [picked, setPicked] = useState<Record<string, Set<string>>>({});

  if (attemptStatus === "in_progress" && attemptId) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/exams/${examId}/take`}>
          <Button>
            <RotateCcw className="h-4 w-4" /> Resume examination
          </Button>
        </Link>
        <p className="text-sm font-semibold text-ink-400">
          Your saved answers are safe — pick up right where you left off.
        </p>
      </div>
    );
  }

  if (attemptStatus && attemptStatus !== "in_progress") {
    const published = attemptStatus === "result_published" || attemptStatus === "evaluated";
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Chip2 status={attemptStatus} />
        {published ? (
          <Link href={`/exams/${examId}/result`}>
            <Button variant="mint">
              <ClipboardCheck className="h-4 w-4" /> View result
            </Button>
          </Link>
        ) : (
          <p className="text-sm font-semibold text-ink-400">
            Your answers were submitted — the result will appear here once your
            teacher finishes evaluating.
          </p>
        )}
      </div>
    );
  }

  const hasSelection = !!selection && selection.groups.length > 0;

  function togglePick(groupId: string, questionId: string, pickCount: number) {
    setPicked((prev) => {
      const next = { ...prev };
      const set = new Set(next[groupId] ?? []);
      if (set.has(questionId)) {
        set.delete(questionId);
      } else if (set.size < pickCount) {
        set.add(questionId);
      }
      next[groupId] = set;
      return next;
    });
  }

  function selectionComplete(): boolean {
    if (!selection) return true;
    return selection.groups.every((g) => (picked[g.id]?.size ?? 0) === g.pick_count);
  }

  function selectedIds(): string[] {
    return Object.values(picked).flatMap((s) => [...s]);
  }

  if (confirming) {
    return (
      <div className="rounded-2xl border-2 border-sun-300 bg-sun-100/50 p-4">
        {hasSelection && (
          <div className="mb-4 flex flex-col gap-4">
            <p className="text-sm font-extrabold text-ink-700">
              This paper has optional questions — choose the ones you will attempt.
              Your selection is final once the exam starts.
            </p>
            {selection!.groups.map((g) => {
              const members = selection!.questions.filter((q) => q.optional_group_id === g.id);
              const chosen = picked[g.id]?.size ?? 0;
              return (
                <div key={g.id} className="rounded-xl bg-white p-3">
                  <p className="text-sm font-extrabold text-ink-700">
                    {g.title}{" "}
                    <span className="font-bold text-ink-400">
                      — pick {g.pick_count} ({chosen}/{g.pick_count} chosen, max {g.max_counted_marks} marks count)
                    </span>
                  </p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {members.map((q) => {
                      const on = picked[g.id]?.has(q.id) ?? false;
                      const disabled = !on && chosen >= g.pick_count;
                      return (
                        <label
                          key={q.id}
                          className={`flex cursor-pointer items-start gap-2 rounded-lg border-2 px-3 py-2 text-sm ${
                            on ? "border-lav-400 bg-lav-50" : "border-cream-200 bg-cream-50"
                          } ${disabled ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-lav-500"
                            checked={on}
                            disabled={disabled}
                            onChange={() => togglePick(g.id, q.id, g.pick_count)}
                          />
                          <span className="font-semibold text-ink-600">
                            <span className="font-extrabold text-ink-800">Q{q.question_number}</span>{" "}
                            {q.prompt.split("\n")[0].slice(0, 140)}
                            <span className="ml-1 font-bold text-ink-400">({q.marks} marks)</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-sm font-bold text-ink-700">
          Ready? Once you start, the countdown timer begins and your attempt is
          recorded. Answers are saved automatically — you can close and resume
          later while time remains.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending || (hasSelection && !selectionComplete())}
            onClick={async () => {
              setPending(true);
              setError(null);
              const res = await startExamAction(examId, hasSelection ? selectedIds() : undefined);
              setPending(false);
              if (!res.ok) {
                setError(res.error ?? "Could not start the exam.");
                return;
              }
              router.push(`/exams/${examId}/take`);
            }}
          >
            <Play className="h-4 w-4" /> {pending ? "Starting…" : "Yes, start the exam"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Not yet
          </Button>
        </div>
        {hasSelection && !selectionComplete() && (
          <p className="mt-2 text-xs font-bold text-sun-500">
            Complete all required selections above to start.
          </p>
        )}
        {error && <p className="mt-2 text-sm font-bold text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button onClick={() => setConfirming(true)}>
          <Play className="h-4 w-4" /> Start examination
        </Button>
      </div>
      <p className="text-xs font-semibold text-ink-400">
        The timer starts immediately and cannot be paused.
      </p>
    </div>
  );
}

function Chip2({ status }: { status: AttemptStatus }) {
  const labels: Record<AttemptStatus, string> = {
    in_progress: "In progress",
    submitted: "Submitted",
    under_evaluation: "Under evaluation",
    evaluation_completed: "Evaluation completed",
    result_published: "Result published",
    evaluated: "Evaluated",
  };
  return (
    <span className="rounded-full bg-lav-100 px-3 py-1 text-xs font-bold text-lav-600">
      {labels[status]}
    </span>
  );
}
