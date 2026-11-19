"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { submitPracticeAnswerAction } from "@/app/actions/practice";
import { PRACTICE_TYPE_LABELS, type PracticeQuestionSafe } from "@/lib/practice/shared";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea, Input } from "@/components/ui/Field";
import { emitRobotEvent } from "@/lib/mascot/events";

interface Feedback {
  correct: boolean;
  marksAwarded: number;
  maxMarks: number;
  verdict: string;
  explanation: string | null;
  xp: number;
}

const DIFF_LABELS = ["", "Very easy", "Easy", "Medium", "Hard", "Very hard"];

export function PracticeSession({ questions, backHref }: { questions: PracticeQuestionSafe[]; backHref: string }) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earned, setEarned] = useState(0);
  const [maxEarned, setMaxEarned] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [pending, startTransition] = useTransition();

  const q = questions[index];
  const finished = index >= questions.length;
  const isMcq = q?.type === "mcq";
  const isTheory = q?.type === "theory";

  const payload = useMemo(() => {
    if (!q) return {};
    if (q.type === "mcq") return { optionId: selected };
    return { text: draft };
  }, [q, selected, draft]);

  const canSubmit = isMcq ? selected !== null : draft.trim().length > 0;

  function submit() {
    if (!q || !canSubmit) return;
    setError(null);
    startTransition(async () => {
      const res = await submitPracticeAnswerAction(q.id, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const fb: Feedback = {
        correct: res.correct, marksAwarded: res.marksAwarded, maxMarks: res.maxMarks,
        verdict: res.verdict, explanation: res.explanation, xp: res.xp,
      };
      setFeedback(fb);
      setEarned((e) => e + res.marksAwarded);
      setMaxEarned((m) => m + res.maxMarks);
      setXpTotal((x) => x + res.xp);
      setAnsweredCount((c) => c + 1);
      emitRobotEvent(res.correct ? "celebrating" : "encouraging");
    });
  }

  function next() {
    setIndex((i) => i + 1);
    setDraft("");
    setSelected(null);
    setFeedback(null);
    setError(null);
  }

  if (finished) {
    const pct = maxEarned > 0 ? Math.round((earned / maxEarned) * 100) : 0;
    return (
      <Card className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 p-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-lav-100 to-mint-100">
          <Sparkles className="h-8 w-8 text-lav-500" />
        </span>
        <h2 className="text-2xl font-extrabold text-ink-800">Practice set complete!</h2>
        <p className="text-sm font-semibold text-ink-500">
          You answered {answeredCount} question{answeredCount === 1 ? "" : "s"} and scored{" "}
          <span className="font-extrabold text-ink-700">{earned}/{maxEarned} marks ({pct}%)</span>
          {xpTotal > 0 && <> — plus <span className="font-extrabold text-lav-600">+{xpTotal} XP</span></>}.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={backHref}><Button variant="secondary"><RotateCcw className="h-4 w-4" /> New set</Button></Link>
          <Link href="/practice"><Button>Back to Practice</Button></Link>
          <Link href="/coding"><Button variant="mint">Try Coding Lab</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream-200">
          <div className="h-full rounded-full bg-gradient-to-r from-lav-300 to-mint-300 transition-all duration-500" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs font-extrabold text-ink-400">{index + 1}/{questions.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="lav">{PRACTICE_TYPE_LABELS[q.type]}</Chip>
              <Chip tone="ink">{q.marks} mark{q.marks === 1 ? "" : "s"}</Chip>
              {q.difficulty >= 1 && q.difficulty <= 5 && <Chip tone="sun">{DIFF_LABELS[q.difficulty]}</Chip>}
              {q.topicName && <Chip tone="mint">{q.topicName}</Chip>}
            </div>

            <p className="whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-ink-700">{q.text}</p>

            {/* Answer area */}
            {!feedback ? (
              <div className="flex flex-col gap-3">
                {isMcq ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(q.options ?? []).map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setSelected(o.id)}
                        className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition-all ${
                          selected === o.id
                            ? "border-lav-400 bg-lav-100 text-lav-700"
                            : "border-cream-300 bg-cream-100 text-ink-600 hover:border-lav-300"
                        }`}
                      >
                        <span className="mr-2 font-extrabold text-ink-400">{o.label})</span>
                        {o.text}
                      </button>
                    ))}
                  </div>
                ) : isTheory ? (
                  <Textarea
                    rows={5}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write your answer — cover the key points. Partial credit is awarded for the right ideas."
                  />
                ) : q.type === "true_false" ? (
                  <div className="flex gap-2">
                    {["True", "False"].map((v) => (
                      <button
                        key={v}
                        onClick={() => setDraft(v)}
                        className={`flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-extrabold transition-all ${
                          draft === v ? "border-lav-400 bg-lav-100 text-lav-700" : "border-cream-300 bg-cream-100 text-ink-600 hover:border-lav-300"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={q.type === "output_prediction" ? "Type the exact output the program prints…" : q.type === "find_error" ? "Type the corrected statement…" : "Type your answer…"}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                  />
                )}

                {error && <p className="text-sm font-bold text-red-500">{error}</p>}
                <div>
                  <Button onClick={submit} loading={pending} disabled={!canSubmit}>
                    Check answer
                  </Button>
                </div>
              </div>
            ) : (
              <motion.div
                key={`fb-${index}-${answeredCount}`}
                initial={feedback.correct ? { opacity: 0, scale: 0.94 } : { opacity: 0, x: -10 }}
                animate={
                  feedback.correct
                    ? { opacity: 1, scale: [0.94, 1.03, 1] }
                    : { opacity: 1, x: [0, -5, 4, -2, 0] }
                }
                transition={{ duration: feedback.correct ? 0.45 : 0.3, ease: "easeOut" }}
                className="relative flex flex-col gap-3"
              >
                {feedback.correct && (
                  <span aria-hidden="true" className="pointer-events-none absolute -top-2 left-8 flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 6, scale: 0.4 }}
                        animate={{ opacity: [0, 1, 0], y: -18 - i * 3, scale: 1 }}
                        transition={{ duration: 0.7, delay: i * 0.06, ease: "easeOut" }}
                        className="h-1.5 w-1.5 rounded-full bg-mint-300"
                      />
                    ))}
                  </span>
                )}
                <div className={`flex items-start gap-3 rounded-2xl p-4 ${feedback.correct ? "bg-mint-50 ring-2 ring-mint-300/50" : "bg-sun-50"}`}>
                  {feedback.correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint-500" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />}
                  <div>
                    <p className={`text-sm font-extrabold ${feedback.correct ? "text-mint-600" : "text-ink-700"}`}>
                      {feedback.verdict} — {feedback.marksAwarded}/{feedback.maxMarks} marks{feedback.xp > 0 ? ` · +${feedback.xp} XP` : ""}
                    </p>
                    {feedback.explanation && (
                      <p className="mt-1.5 text-sm font-semibold leading-relaxed text-ink-500">
                        <span className="font-extrabold text-ink-600">Why: </span>{feedback.explanation}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={next}>
                    {index === questions.length - 1 ? "See results" : "Next question"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
