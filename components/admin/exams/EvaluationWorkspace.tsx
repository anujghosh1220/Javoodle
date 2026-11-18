"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { saveEvaluationAction, publishResultAction } from "@/app/actions/exam-admin";
import {
  groupQuestionsBySection,
  PAPER_QUESTION_TYPE_LABELS,
  ATTEMPT_STATUS_LABELS,
} from "@/lib/exams/shared";
import type { EvaluationWorkspaceData } from "@/lib/exams/admin-data";
import { CheckCircle, FileText, ChevronLeft, ChevronRight } from "lucide-react";

interface EvalState {
  marks: string;
  feedback: string;
  saved: boolean;
  saving: boolean;
  error: string | null;
}

export function EvaluationWorkspace({ data }: { data: EvaluationWorkspaceData }) {
  const router = useRouter();
  const { attempt, studentName, examTitle, snapshot, answers, evaluations, selectedQuestionIds, paperSignedUrl, paperFileName } = data;

  const answerMap = useMemo(
    () => new Map(answers.map((a) => [a.paper_question_id, a])),
    [answers]
  );
  const evalMap = useMemo(
    () => new Map(evaluations.map((e) => [e.paper_question_id, e])),
    [evaluations]
  );

  const groups = useMemo(
    () => groupQuestionsBySection(snapshot?.sections ?? [], snapshot?.questions ?? []),
    [snapshot]
  );
  const flatQuestions = useMemo(
    () => groups.flatMap((g) => g.questions),
    [groups]
  );

  const [evals, setEvals] = useState<Record<string, EvalState>>(() => {
    const init: Record<string, EvalState> = {};
    for (const q of flatQuestions) {
      const existing = evalMap.get(q.id);
      init[q.id] = {
        marks: existing ? String(existing.marks_awarded) : "",
        feedback: existing?.feedback ?? "",
        saved: !!existing,
        saving: false,
        error: null,
      };
    }
    return init;
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // A question counts as evaluated when it was saved in this session OR an
  // evaluation row already exists server-side (auto-graded MCQs, saves made
  // before this component mounted, or by another admin). The server remains
  // the authority — publishResultAction re-validates independently.
  const serverEvaluated = useMemo(
    () => new Set(evaluations.map((e) => e.paper_question_id)),
    [evaluations]
  );

  // Optional questions the student did not select are excluded from scoring.
  const hasGroups = (snapshot?.optional_groups ?? []).length > 0;
  const selectedSet = useMemo(() => new Set(selectedQuestionIds ?? []), [selectedQuestionIds]);
  const excludedIds = useMemo(() => {
    if (!hasGroups || selectedSet.size === 0) return new Set<string>();
    return new Set(
      (snapshot?.questions ?? [])
        .filter((q) => q.optional_group_id && !selectedSet.has(q.id))
        .map((q) => q.id)
    );
  }, [hasGroups, selectedSet, snapshot]);

  const requiredQuestions = useMemo(
    () => flatQuestions.filter((q) => !excludedIds.has(q.id)),
    [flatQuestions, excludedIds]
  );

  const totalMarks = attempt.total_marks ?? 0;
  const awardedNow = requiredQuestions.reduce((sum, q) => {
    const m = Number(evals[q.id]?.marks);
    return sum + (Number.isFinite(m) ? m : 0);
  }, 0);
  const evaluatedCount = requiredQuestions.filter(
    (q) => evals[q.id]?.saved || serverEvaluated.has(q.id)
  ).length;
  const allEvaluated = requiredQuestions.length > 0 && evaluatedCount === requiredQuestions.length;

  const q = flatQuestions[currentIdx];
  const answer = q ? answerMap.get(q.id) : undefined;
  const ev = q ? evals[q.id] : undefined;

  function setEval(qid: string, patch: Partial<EvalState>) {
    setEvals((prev) => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
  }

  async function saveCurrent() {
    if (!q || !ev) return;
    if (excludedIds.has(q.id)) {
      setEval(q.id, { error: "Not attempted — optional question the student did not select." });
      return;
    }
    const marks = Number(ev.marks);
    if (ev.marks.trim() === "" || !Number.isFinite(marks)) {
      setEval(q.id, { error: "Enter marks (0 to " + q.marks + ")." });
      return;
    }
    if (marks < 0 || marks > Number(q.marks)) {
      setEval(q.id, { error: `Marks must be between 0 and ${q.marks}.` });
      return;
    }
    setEval(q.id, { saving: true, error: null });
    const res = await saveEvaluationAction(attempt.id, q.id, marks, ev.feedback || null);
    setEval(q.id, {
      saving: false,
      saved: res.ok,
      error: res.ok ? null : res.error ?? "Save failed.",
    });
    if (res.ok) router.refresh();
  }

  async function publish() {
    setPublishing(true);
    setPublishMsg(null);
    const res = await publishResultAction(attempt.id);
    setPublishing(false);
    setPublishMsg(res.ok ? "Result published — the student can now see it." : res.error ?? "Publish failed.");
    if (res.ok) router.refresh();
  }

  const statusLabel = ATTEMPT_STATUS_LABELS[attempt.status] ?? attempt.status;

  return (
    <div className="flex flex-col gap-6">
      {/* Header / progress */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold text-ink-800">{studentName}</h1>
            <Chip tone={attempt.status === "result_published" ? "mint" : "lav"}>{statusLabel}</Chip>
          </div>
          <p className="mt-1 text-sm font-semibold text-ink-400">
            {examTitle}
            {attempt.submitted_at ? ` · submitted ${new Date(attempt.submitted_at).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
          <span className="text-ink-600">
            Evaluated {evaluatedCount}/{flatQuestions.length}
          </span>
          <span className="text-ink-800">
            Awarded {awardedNow}/{totalMarks}
            {attempt.percentage !== null ? ` · ${attempt.percentage}%` : ""}
          </span>
          {attempt.passing_marks !== null && (
            <span className="text-ink-400">pass ≥ {attempt.passing_marks}</span>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Question navigator */}
        <Card className="h-fit p-4">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-400">
            Questions
          </h2>
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {groups.map((g) => (
              <div key={g.section?.id ?? "none"}>
                {g.section && (
                  <p className="mb-1 text-xs font-extrabold text-lav-500">{g.section.title}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {g.questions.map((qq) => {
                    const e = evals[qq.id];
                    const done = e?.saved;
                    const active = qq.id === q?.id;
                    return (
                      <button
                        key={qq.id}
                        type="button"
                        onClick={() => setCurrentIdx(flatQuestions.findIndex((x) => x.id === qq.id))}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold transition-colors ${
                          active
                            ? "bg-lav-400 text-white"
                            : done
                              ? "bg-mint-100 text-mint-600"
                              : "bg-cream-100 text-ink-500 hover:bg-cream-200"
                        }`}
                        title={`Q${qq.question_number} · ${qq.marks} marks`}
                      >
                        {qq.question_number}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Evaluation panel */}
        <div className="flex flex-col gap-4">
          {paperSignedUrl && (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b-2 border-cream-200 px-4 py-2">
                <FileText className="h-4 w-4 text-lav-500" />
                <span className="text-sm font-extrabold text-ink-700">
                  Question paper{paperFileName ? ` — ${paperFileName}` : ""}
                </span>
              </div>
              <iframe src={paperSignedUrl} className="h-[50vh] w-full" title="Question paper" />
            </Card>
          )}

          {q && ev && (
            <Card className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Chip tone="lav">Question {q.question_number}</Chip>
                  <Chip tone="ink">{PAPER_QUESTION_TYPE_LABELS[q.question_type]}</Chip>
                  <Chip tone="sun">Max {q.marks} marks</Chip>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" disabled={currentIdx === 0} onClick={() => setCurrentIdx((i) => i - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button size="sm" variant="ghost" disabled={currentIdx >= flatQuestions.length - 1} onClick={() => setCurrentIdx((i) => i + 1)}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-ink-400">Question</p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-ink-700">{q.prompt}</p>
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-ink-400">
                  Student&apos;s answer{q.question_type === "mcq" && answer?.mcq_option ? ` — chose ${answer.mcq_option}` : ""}
                </p>
                {answer && (answer.answer_text.trim() || answer.mcq_option) ? (
                  q.question_type === "program" || q.question_type === "output" ? (
                    <pre className="mt-1 overflow-x-auto rounded-xl bg-ink-800 p-4 font-mono text-sm text-cream-100">
                      {answer.answer_text || `(selected ${answer.mcq_option})`}
                    </pre>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap rounded-xl bg-cream-50 p-4 text-sm font-semibold text-ink-700">
                      {answer.answer_text || `(selected ${answer.mcq_option})`}
                    </p>
                  )
                ) : (
                  <p className="mt-1 rounded-xl bg-red-500/10 p-4 text-sm font-bold text-red-500">
                    No answer submitted for this question.
                  </p>
                )}
              </div>

              {q.model_answer && (
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-ink-400">Model answer</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-xl bg-mint-50 p-4 font-mono text-xs text-ink-700">
                    {q.model_answer}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <div>
                  <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-400">
                    Marks awarded (max {q.marks})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={q.marks}
                    step={0.5}
                    value={ev.marks}
                    onChange={(e) => setEval(q.id, { marks: e.target.value, saved: false })}
                    className="w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3 py-2 text-sm font-bold text-ink-700 outline-none focus:border-lav-300"
                    placeholder="0"
                  />
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setEval(q.id, { marks: String(q.marks), saved: false })}>
                      Full
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEval(q.id, { marks: "0", saved: false })}>
                      Zero
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-400">
                    Feedback for student (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={ev.feedback}
                    onChange={(e) => setEval(q.id, { feedback: e.target.value, saved: false })}
                    className="w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-lav-300"
                    placeholder="What was good, what was missing…"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button size="sm" onClick={saveCurrent} disabled={ev.saving}>
                  {ev.saving ? "Saving…" : ev.saved ? "Update marks" : "Save marks"}
                </Button>
                {ev.saved && !ev.error && (
                  <span className="flex items-center gap-1 text-sm font-bold text-mint-600">
                    <CheckCircle className="h-4 w-4" /> Saved
                  </span>
                )}
                {ev.error && <span className="text-sm font-bold text-red-500">{ev.error}</span>}
                <span className="ml-auto text-xs font-bold text-ink-400">
                  Question {currentIdx + 1} of {flatQuestions.length}
                </span>
              </div>
            </Card>
          )}

          {/* Publish */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="font-extrabold text-ink-700">Result</h2>
              <p className="text-sm font-semibold text-ink-400">
                {allEvaluated
                  ? `${awardedNow}/${totalMarks} marks (${attempt.percentage ?? "—"}%). Ready to publish.`
                  : `Evaluate all ${flatQuestions.length} questions to complete (${evaluatedCount} done).`}
              </p>
              {publishMsg && <p className="mt-1 text-sm font-bold text-mint-600">{publishMsg}</p>}
            </div>
            <Button onClick={publish} disabled={!allEvaluated || publishing || attempt.status === "result_published"}>
              {attempt.status === "result_published"
                ? "Result published"
                : publishing
                  ? "Publishing…"
                  : "Publish result"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
