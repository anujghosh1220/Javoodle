"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { saveExamStructureAction } from "@/app/actions/exam-admin";
import {
  PAPER_QUESTION_TYPES,
  PAPER_QUESTION_TYPE_LABELS,
  type PaperQuestionType,
  type ExamSection,
  type PaperQuestion,
} from "@/lib/exams/shared";
import { Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";

interface SectionState {
  key: string;
  title: string;
}

interface QuestionState {
  key: string;
  section_key: string;
  question_number: string;
  prompt: string;
  question_type: PaperQuestionType;
  marks: number;
  options: Array<{ label: string; text: string }>;
  model_answer: string;
}

const inputCls =
  "w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-lav-300";

let keyCounter = 0;
const nextKey = () => `k${Date.now().toString(36)}_${keyCounter++}`;

function toState(
  sections: ExamSection[],
  questions: PaperQuestion[]
): { sections: SectionState[]; questions: QuestionState[] } {
  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);
  const sectionStates =
    sortedSections.length > 0
      ? sortedSections.map((s) => ({ key: s.id, title: s.title }))
      : [{ key: "default", title: "Section A" }];
  const firstKey = sectionStates[0].key;
  return {
    sections: sectionStates,
    questions: [...questions]
      .sort((a, b) => a.order_index - b.order_index)
      .map((q) => ({
        key: q.id,
        section_key: q.section_id ?? firstKey,
        question_number: q.question_number,
        prompt: q.prompt,
        question_type: q.question_type,
        marks: q.marks,
        options: q.options ?? [],
        model_answer: q.model_answer ?? "",
      })),
  };
}

export function QuestionStructureEditor({
  examId,
  sections,
  questions,
  totalMarks,
  frozen,
  attemptCount,
}: {
  examId: string;
  sections: ExamSection[];
  questions: PaperQuestion[];
  totalMarks: number;
  frozen: boolean;
  attemptCount: number;
}) {
  const router = useRouter();
  const initial = useMemo(() => toState(sections, questions), [sections, questions]);
  const [secs, setSecs] = useState<SectionState[]>(initial.sections);
  const [qs, setQs] = useState<QuestionState[]>(initial.questions);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const marksSum = qs.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const marksMatch = Math.abs(marksSum - totalMarks) < 0.001;

  function patchQuestion(key: string, patch: Partial<QuestionState>) {
    setQs((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function addSection() {
    const key = nextKey();
    setSecs((prev) => [...prev, { key, title: `Section ${String.fromCharCode(65 + prev.length)}` }]);
  }

  function removeSection(key: string) {
    if (qs.some((q) => q.section_key === key)) {
      setMsg({ ok: false, text: "Move or delete this section's questions first." });
      return;
    }
    setSecs((prev) => prev.filter((s) => s.key !== key));
  }

  function moveSection(key: string, dir: -1 | 1) {
    setSecs((prev) => {
      const i = prev.findIndex((s) => s.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function addQuestion(sectionKey: string) {
    const sectionQs = qs.filter((q) => q.section_key === sectionKey);
    const lastNum = sectionQs[sectionQs.length - 1]?.question_number ?? "";
    const numMatch = lastNum.match(/(\d+)$/);
    const nextNum = numMatch ? String(Number(numMatch[1]) + 1) : String(sectionQs.length + 1);
    setQs((prev) => [
      ...prev,
      {
        key: nextKey(),
        section_key: sectionKey,
        question_number: nextNum,
        prompt: "",
        question_type: "theory",
        marks: 2,
        options: [],
        model_answer: "",
      },
    ]);
  }

  function removeQuestion(key: string) {
    setQs((prev) => prev.filter((q) => q.key !== key));
  }

  function moveQuestion(key: string, dir: -1 | 1) {
    setQs((prev) => {
      const i = prev.findIndex((q) => q.key === key);
      if (i < 0) return prev;
      // Find nearest neighbour in the same section.
      let j = i + dir;
      while (j >= 0 && j < prev.length && prev[j].section_key !== prev[i].section_key) {
        j += dir;
      }
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function setMcqOption(qkey: string, idx: number, text: string) {
    setQs((prev) =>
      prev.map((q) => {
        if (q.key !== qkey) return q;
        const options = [...q.options];
        options[idx] = { ...options[idx], text };
        return { ...q, options };
      })
    );
  }

  async function save() {
    setPending(true);
    setMsg(null);
    const payload = {
      sections: secs.map((s, i) => ({ key: s.key, title: s.title, order_index: i })),
      questions: qs.map((q) => ({
        section_key: q.section_key,
        question_number: q.question_number,
        prompt: q.prompt,
        question_type: q.question_type,
        marks: q.marks,
        options: q.question_type === "mcq" ? q.options.filter((o) => o.text.trim()) : [],
        model_answer: q.model_answer.trim() ? q.model_answer : null,
      })),
    };
    const res = await saveExamStructureAction(examId, JSON.stringify(payload));
    setPending(false);
    setMsg({ ok: res.ok, text: res.ok ? "Question structure saved." : res.error ?? "Save failed." });
    if (res.ok) router.refresh();
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-extrabold text-ink-700">Sections, questions &amp; marks</h2>
          <p className="mt-1 text-xs font-semibold text-ink-400">
            One row = one markable question or sub-question (e.g. <code>3(a)</code>). These are the
            units you will evaluate later.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone={marksMatch ? "mint" : "sun"}>
            Questions sum to {marksSum} / {totalMarks} marks
          </Chip>
          {!marksMatch && (
            <span className="flex items-center gap-1 text-xs font-bold text-sun-500">
              <AlertTriangle className="h-3.5 w-3.5" /> must match total marks to publish
            </span>
          )}
        </div>
      </div>

      {frozen && (
        <p className="mt-3 rounded-xl bg-sun-100 px-4 py-2 text-sm font-bold text-ink-600">
          This exam has {attemptCount} student attempt{attemptCount === 1 ? "" : "s"} — its question
          structure is frozen to protect them. Create a new exam for changes.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-6">
        {secs.map((sec, si) => {
          const secQuestions = qs.filter((q) => q.section_key === sec.key);
          return (
            <div key={sec.key} className="rounded-2xl border-2 border-cream-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputCls} max-w-xs font-extrabold`}
                  value={sec.title}
                  disabled={frozen}
                  onChange={(e) =>
                    setSecs((prev) => prev.map((s) => (s.key === sec.key ? { ...s, title: e.target.value } : s)))
                  }
                  placeholder="Section name"
                />
                <span className="text-xs font-bold text-ink-400">
                  {secQuestions.length} question{secQuestions.length === 1 ? "" : "s"} ·{" "}
                  {secQuestions.reduce((s, q) => s + (Number(q.marks) || 0), 0)} marks
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <Button type="button" size="sm" variant="ghost" disabled={frozen || si === 0} onClick={() => moveSection(sec.key, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={frozen || si === secs.length - 1} onClick={() => moveSection(sec.key, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={frozen} onClick={() => removeSection(sec.key)} className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                {secQuestions.length === 0 && (
                  <p className="text-sm font-semibold text-ink-400">No questions in this section yet.</p>
                )}
                {secQuestions.map((q, qi) => (
                  <div key={q.key} className="rounded-xl bg-cream-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        className={`${inputCls} w-24`}
                        value={q.question_number}
                        disabled={frozen}
                        onChange={(e) => patchQuestion(q.key, { question_number: e.target.value })}
                        placeholder="No."
                      />
                      <select
                        className={`${inputCls} w-40`}
                        value={q.question_type}
                        disabled={frozen}
                        onChange={(e) => patchQuestion(q.key, { question_type: e.target.value as PaperQuestionType })}
                      >
                        {PAPER_QUESTION_TYPES.map((t) => (
                          <option key={t} value={t}>{PAPER_QUESTION_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                      <input
                        className={`${inputCls} w-24`}
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={q.marks}
                        disabled={frozen}
                        onChange={(e) => patchQuestion(q.key, { marks: Number(e.target.value) })}
                        placeholder="Marks"
                      />
                      <span className="text-xs font-bold text-ink-400">marks</span>
                      <select
                        className={`${inputCls} w-44`}
                        value={q.section_key}
                        disabled={frozen}
                        onChange={(e) => patchQuestion(q.key, { section_key: e.target.value })}
                      >
                        {secs.map((s) => (
                          <option key={s.key} value={s.key}>{s.title || "Section"}</option>
                        ))}
                      </select>
                      <span className="ml-auto flex items-center gap-1">
                        <Button type="button" size="sm" variant="ghost" disabled={frozen || qi === 0} onClick={() => moveQuestion(q.key, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" disabled={frozen || qi === secQuestions.length - 1} onClick={() => moveQuestion(q.key, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" disabled={frozen} onClick={() => removeQuestion(q.key)} className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    </div>

                    <textarea
                      className={`${inputCls} mt-3`}
                      rows={3}
                      value={q.prompt}
                      disabled={frozen}
                      onChange={(e) => patchQuestion(q.key, { prompt: e.target.value })}
                      placeholder="Question prompt — what the student must answer (the full text lives in the PDF; this is the evaluation reference)."
                    />

                    {q.question_type === "mcq" && (
                      <div className="mt-3 flex flex-col gap-2">
                        {q.options.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <span className="w-6 text-center font-extrabold text-lav-500">
                              {o.label || String.fromCharCode(65 + oi)}
                            </span>
                            <input
                              className={inputCls}
                              value={o.text}
                              disabled={frozen}
                              onChange={(e) => setMcqOption(q.key, oi, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            />
                            <Button type="button" size="sm" variant="ghost" disabled={frozen} onClick={() =>
                              patchQuestion(q.key, { options: q.options.filter((_, i) => i !== oi) })
                            } className="text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={frozen || q.options.length >= 10}
                          onClick={() =>
                            patchQuestion(q.key, {
                              options: [...q.options, { label: String.fromCharCode(65 + q.options.length), text: "" }],
                            })
                          }
                        >
                          <Plus className="h-4 w-4" /> Add option
                        </Button>
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-400">
                        Model answer (optional — released only if enabled)
                      </label>
                      <textarea
                        className={`${inputCls} font-mono text-xs`}
                        rows={3}
                        value={q.model_answer}
                        disabled={frozen}
                        onChange={(e) => patchQuestion(q.key, { model_answer: e.target.value })}
                        placeholder="Ideal answer or key points for marking…"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Button type="button" size="sm" variant="secondary" disabled={frozen} onClick={() => addQuestion(sec.key)}>
                  <Plus className="h-4 w-4" /> Add question to {sec.title || "section"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" disabled={frozen || secs.length >= 20} onClick={addSection}>
          <Plus className="h-4 w-4" /> Add section
        </Button>
        <Button type="button" onClick={save} disabled={frozen || pending}>
          {pending ? "Saving…" : "Save question structure"}
        </Button>
        {msg && (
          <span className={`text-sm font-bold ${msg.ok ? "text-mint-600" : "text-red-500"}`}>{msg.text}</span>
        )}
      </div>
    </Card>
  );
}
