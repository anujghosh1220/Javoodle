"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { emitRobotEvent } from "@/lib/mascot/events";
import {
  saveExamAnswerAction,
  submitExamAction,
  toggleExamFlagAction,
} from "@/app/actions/exam-student";
import {
  groupQuestionsBySection,
  formatCountdown,
  remainingMs,
  isAnswerEmpty,
  PAPER_QUESTION_TYPE_LABELS,
} from "@/lib/exams/shared";
import type { ExamSnapshot } from "@/lib/exams/shared";

type SnapshotQuestion = ExamSnapshot["questions"][number];
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  CheckCircle,
  AlertTriangle,
  Flag,
} from "lucide-react";

interface AnswerState {
  text: string;
  mcq: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed — will retry",
};

export function ExamRunner({
  attemptId,
  deadlineAt,
  serverNow,
  examTitle,
  totalMarks,
  paperSignedUrl,
  sections,
  questions,
  initialAnswers,
  initialFlags = [],
}: {
  attemptId: string;
  deadlineAt: string;
  serverNow: string;
  examTitle: string;
  totalMarks: number;
  paperSignedUrl: string | null;
  sections: ExamSnapshot["sections"];
  questions: ExamSnapshot["questions"];
  initialAnswers: Array<{ paper_question_id: string; answer_text: string; mcq_option: string | null }>;
  initialFlags?: string[];
}) {
  const groups = useMemo(() => groupQuestionsBySection(sections, questions), [sections, questions]);
  const flat = useMemo(() => groups.flatMap((g) => g.questions), [groups]);

  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const init: Record<string, AnswerState> = {};
    for (const a of initialAnswers) {
      init[a.paper_question_id] = { text: a.answer_text, mcq: a.mcq_option };
    }
    return init;
  });
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPaper, setShowPaper] = useState(false);
  const [flags, setFlags] = useState<Set<string>>(() => new Set(initialFlags));
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingRef = useRef<Record<string, AnswerState>>({});
  const submittedRef = useRef(false);

  const q: SnapshotQuestion | undefined = flat[current];
  const ans: AnswerState = q ? answers[q.id] ?? { text: "", mcq: null } : { text: "", mcq: null };

  const doSubmit = useCallback(
    async (auto = false) => {
      if (submittedRef.current && !auto) return;
      submittedRef.current = true;
      setSubmitting(true);
      // Flush pending debounced saves so the last keystrokes are not lost.
      for (const t of Object.values(timers.current)) clearTimeout(t);
      timers.current = {};
      const flushes = Object.entries(pendingRef.current).map(([qid, a]) =>
        saveExamAnswerAction(attemptId, qid, a.text, a.mcq)
      );
      pendingRef.current = {};
      await Promise.allSettled(flushes);
      await submitExamAction(attemptId);
      setSubmitting(false);
      emitRobotEvent("celebrating");
      setSubmitted(true);
      setConfirming(false);
    },
    [attemptId]
  );

  // Countdown synced to server time (clockOffset computed once on mount —
  // Date.now is only read inside the effect, never during render).
  useEffect(() => {
    const offset = new Date(serverNow).getTime() - Date.now();
    const tick = () => {
      const left = remainingMs(deadlineAt, new Date(Date.now() + offset));
      setRemaining(left);
      if (left <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        void doSubmit(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt, serverNow, doSubmit]);

  // Debounced autosave per question.
  const scheduleSave = useCallback(
    (qid: string, text: string, mcq: string | null) => {
      if (timers.current[qid]) clearTimeout(timers.current[qid]);
      setSaveStates((s) => ({ ...s, [qid]: "saving" }));
      pendingRef.current[qid] = { text, mcq };
      timers.current[qid] = setTimeout(async () => {
        const res = await saveExamAnswerAction(attemptId, qid, text, mcq);
        if (pendingRef.current[qid]?.text === text && pendingRef.current[qid]?.mcq === mcq) {
          delete pendingRef.current[qid];
        }
        setSaveStates((s) => ({ ...s, [qid]: res.ok ? "saved" : "error" }));
        if (!res.ok && res.error?.includes("already been submitted")) {
          submittedRef.current = true;
          setSubmitted(true);
        }
      }, 900);
    },
    [attemptId]
  );

  function toggleFlag() {
    if (!q || submitted) return;
    const next = !flags.has(q.id);
    setFlags((prev) => {
      const s2 = new Set(prev);
      if (next) s2.add(q.id); else s2.delete(q.id);
      return s2;
    });
    void toggleExamFlagAction(attemptId, q.id, next);
  }

  function updateAnswer(patch: Partial<AnswerState>) {
    if (!q || submitted) return;
    const next = { ...ans, ...patch };
    setAnswers((prev) => ({ ...prev, [q.id]: next }));
    scheduleSave(q.id, next.text, next.mcq);
  }

  // Warn before leaving mid-exam.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const answeredCount = flat.filter((qq) => {
    const a = answers[qq.id];
    return a && !isAnswerEmpty(a);
  }).length;
  const unansweredCount = flat.length - answeredCount;
  const urgent = remaining !== null && remaining < 5 * 60 * 1000;

  if (submitted) {
    return <SubmittedScreen examTitle={examTitle} totalMarks={totalMarks} />;
  }

  return (
    <div data-keep-clear className="flex flex-col gap-4">
      {/* Top bar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold text-ink-800">{examTitle}</h1>
          <p className="text-xs font-bold text-ink-400">{totalMarks} marks · answers save automatically</p>
        </div>
        <div className="flex items-center gap-3">
          {q && saveStates[q.id] && (
            <span
              className={`text-xs font-bold ${
                saveStates[q.id] === "saved"
                  ? "text-mint-600"
                  : saveStates[q.id] === "error"
                    ? "text-red-500"
                    : "text-ink-400"
              }`}
            >
              {SAVE_LABEL[saveStates[q.id]]}
            </span>
          )}
          <span
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-mono text-lg font-extrabold ${
              urgent ? "bg-red-500/15 text-red-400" : "bg-lav-100 text-lav-600"
            }`}
          >
            <Clock className="h-4 w-4" />
            {remaining === null ? "--:--" : formatCountdown(remaining)}
          </span>
          <Button size="sm" onClick={() => setConfirming(true)}>
            Submit exam
          </Button>
        </div>
      </Card>

      {paperSignedUrl && (
        <div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowPaper((v) => !v)}
            className="lg:hidden"
          >
            <FileText className="h-4 w-4" /> {showPaper ? "Hide" : "View"} question paper
          </Button>
          <Card className={`mt-2 overflow-hidden p-0 ${showPaper ? "" : "hidden lg:block"}`}>
            <iframe
              src={paperSignedUrl}
              title="Question paper"
              className="h-[60vh] w-full"
            />
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        {/* Question panel */}
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.section?.id ?? "none"}>
              {g.section && (
                <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-lav-500">
                  {g.section.title}
                </h2>
              )}
              <div className="flex flex-col gap-4">
                {g.questions.map((qq) => {
                  const idx = flat.findIndex((x) => x.id === qq.id);
                  if (idx !== current) return null;
                  return (
                    <motion.div
                      key={qq.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <QuestionCard
                        question={qq}
                        answer={answers[qq.id] ?? { text: "", mcq: null }}
                        onChange={updateAnswer}
                        disabled={submitted}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Prev / Next */}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              disabled={current === 0}
              onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <div className="flex items-center gap-2">
              {q && (
                <Button
                  variant={flags.has(q.id) ? "sun" : "secondary"}
                  size="sm"
                  onClick={toggleFlag}
                  title={flags.has(q.id) ? "Unmark for review" : "Mark for review"}
                >
                  <Flag className="h-4 w-4" /> {flags.has(q.id) ? "Flagged" : "Mark for review"}
                </Button>
              )}
              <span className="text-sm font-bold text-ink-400">
                Question {current + 1} of {flat.length}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={current >= flat.length - 1}
              onClick={() => setCurrent((i) => Math.min(flat.length - 1, i + 1))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Palette */}
        <Card className="h-fit p-4">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-ink-400">
            Questions
          </h2>
          <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
            {groups.map((g) => (
              <div key={g.section?.id ?? "none"}>
                {g.section && (
                  <p className="mb-1 text-[11px] font-extrabold text-lav-500">{g.section.title}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {g.questions.map((qq) => {
                    const idx = flat.findIndex((x) => x.id === qq.id);
                    const a = answers[qq.id];
                    const done = a && !isAnswerEmpty(a);
                    const active = idx === current;
                    return (
                      <button
                        key={qq.id}
                        type="button"
                        onClick={() => setCurrent(idx)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold transition-colors ${
                          active
                            ? "bg-lav-400 text-white"
                            : done
                              ? "bg-mint-100 text-mint-600"
                              : "bg-cream-100 text-ink-500 hover:bg-cream-200"
                        } ${flags.has(qq.id) && !active ? "ring-2 ring-sun-400" : ""}`}
                        title={`Q${qq.question_number} · ${qq.marks} marks${done ? " · answered" : ""}`}
                      >
                        {qq.question_number}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t-2 border-cream-200 pt-3 text-xs font-bold text-ink-400">
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded bg-mint-100" /> Answered ({answeredCount})
            </p>
            <p className="mt-1 flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded bg-cream-100" /> Unanswered ({unansweredCount})
            </p>
            <p className="mt-1 flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded ring-2 ring-sun-400" /> Flagged for review ({flags.size})
            </p>
          </div>
        </Card>
      </div>

      {/* Submit confirmation */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-800/40 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-extrabold text-ink-800">Submit your exam?</h2>
            <ul className="mt-3 space-y-1.5 text-sm font-semibold text-ink-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-mint-600" /> {answeredCount} answered
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-sun-500" /> {unansweredCount} unanswered
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-lav-500" /> {remaining === null ? "--:--" : formatCountdown(remaining)} remaining
              </li>
            </ul>
            {unansweredCount > 0 && (
              <p className="mt-3 rounded-xl bg-sun-100 px-3 py-2 text-xs font-bold text-ink-600">
                Unanswered questions will be marked zero unless your teacher decides otherwise.
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                className="flex-1"
                disabled={submitting}
                onClick={() => void doSubmit()}
              >
                {submitting ? "Submitting…" : "Yes, submit"}
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Keep writing
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question: q,
  answer,
  onChange,
  disabled,
}: {
  question: SnapshotQuestion;
  answer: AnswerState;
  onChange: (patch: Partial<AnswerState>) => void;
  disabled: boolean;
}) {
  const isCode = q.question_type === "program" || q.question_type === "output";
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="lav">Question {q.question_number}</Chip>
        <Chip tone="ink">{PAPER_QUESTION_TYPE_LABELS[q.question_type]}</Chip>
        <Chip tone="sun">{q.marks} marks</Chip>
      </div>
      <p className="whitespace-pre-wrap text-sm font-semibold text-ink-700">{q.prompt}</p>

      {q.question_type === "mcq" && q.options.length > 0 ? (
        <div className="flex flex-col gap-2">
          {q.options.map((o) => (
            <label
              key={o.label}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
                answer.mcq === o.label
                  ? "border-lav-400 bg-lav-50"
                  : "border-cream-200 bg-cream-200 hover:border-lav-200"
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                type="radio"
                name={`mcq-${q.id}`}
                className="mt-1 h-4 w-4 accent-lav-500"
                checked={answer.mcq === o.label}
                disabled={disabled}
                onChange={() => onChange({ mcq: o.label })}
              />
              <span className="text-sm font-bold text-ink-700">
                <span className="mr-1 font-extrabold text-lav-500">{o.label}.</span>
                {o.text}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <textarea
          value={answer.text}
          disabled={disabled}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={isCode ? 12 : q.question_type === "short_answer" ? 3 : 8}
          placeholder={
            q.question_type === "program"
              ? "Write your Java program here…"
              : q.question_type === "output"
                ? "Write the output here…"
                : "Type your answer here…"
          }
          className={`w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-4 py-3 text-sm font-semibold text-ink-700 outline-none focus:border-lav-300 disabled:opacity-60 ${
            isCode ? "font-mono" : ""
          }`}
        />
      )}
    </Card>
  );
}

function SubmittedScreen({ examTitle, totalMarks }: { examTitle: string; totalMarks: number }) {
  return (
    <Card className="flex flex-col items-center gap-4 p-10 text-center">
      <CheckCircle className="h-14 w-14 text-mint-500" />
      <h1 className="text-2xl font-extrabold text-ink-800">Exam submitted!</h1>
      <p className="max-w-md font-semibold text-ink-400">
        Well done, {examTitle} is complete. Your teacher will evaluate your
        answers ({totalMarks} marks) and publish your result — check the Exams
        page later.
      </p>
      <Link href="/exams">
        <Button variant="secondary">Back to exams</Button>
      </Link>
    </Card>
  );
}
