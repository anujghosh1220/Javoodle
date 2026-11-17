"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { saveExamStructureAction } from "@/app/actions/exam-admin";
import type { PaperQuestion } from "@/lib/exams/shared";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";

const inputCls =
  "w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-lav-300";
const labelCls = "mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-400";

type QType = "mcq" | "program" | "paragraph";

interface QState {
  key: string;
  id?: string;
  prompt: string;
  qtype: QType;
  marks: number;
  optionsText: string;   // mcq: semicolon-separated
  correctText: string;  // mcq: correct option text
  model_answer: string;
}

const TYPE_LABEL: Record<QType, string> = { mcq: "MCQ", program: "Program", paragraph: "Paragraph" };
const TYPE_TONE: Record<QType, "lav" | "mint" | "sun"> = { mcq: "lav", program: "mint", paragraph: "sun" };

let keyCounter = 0;
const nextKey = () => `q${Date.now().toString(36)}_${keyCounter++}`;

function blank(): QState {
  return { key: nextKey(), prompt: "", qtype: "mcq", marks: 1, optionsText: "", correctText: "", model_answer: "" };
}

function fromExisting(q: PaperQuestion): QState {
  const t: QType =
    q.question_type === "mcq" ? "mcq" : q.question_type === "program" || q.question_type === "output" ? "program" : "paragraph";
  return {
    key: q.id,
    id: q.id,
    prompt: q.prompt,
    qtype: t,
    marks: q.marks,
    optionsText: (q.options ?? []).map((o) => o.text).join("; "),
    correctText: q.model_answer ?? "",
    model_answer: q.model_answer ?? "",
  };
}

export function SimpleQuestionEditor({
  examId,
  questions,
  frozen,
}: {
  examId: string;
  questions: PaperQuestion[];
  frozen: boolean;
}) {
  const router = useRouter();
  const [list, setList] = useState<QState[]>(() =>
    [...questions].sort((a, b) => a.order_index - b.order_index).map(fromExisting)
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const patch = (key: string, p: Partial<QState>) =>
    setList((l) => l.map((q) => (q.key === key ? { ...q, ...p } : q)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    setList((l) => {
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  };

  const remove = (key: string) => setList((l) => l.filter((q) => q.key !== key));

  async function save() {
    setMsg(null);
    // Validate
    for (const [i, q] of list.entries()) {
      if (!q.prompt.trim()) return setMsg({ ok: false, text: `Question ${i + 1}: enter the question text.` });
      if (!(q.marks > 0)) return setMsg({ ok: false, text: `Question ${i + 1}: marks must be positive.` });
      if (q.qtype === "mcq") {
        const opts = q.optionsText.split(";").map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) return setMsg({ ok: false, text: `Question ${i + 1}: MCQ needs at least two options separated by semicolons.` });
        if (q.correctText.trim() && !opts.includes(q.correctText.trim()))
          return setMsg({ ok: false, text: `Question ${i + 1}: correct answer must match one of the options.` });
      }
    }
    const payload = {
      sections: [{ key: "main", title: "Questions", order_index: 0 }],
      optional_groups: [],
      questions: list.map((q, i) => {
        const isMcq = q.qtype === "mcq";
        const options = isMcq
          ? q.optionsText.split(";").map((o) => o.trim()).filter(Boolean)
              .map((text, j) => ({ label: String.fromCharCode(65 + j), text }))
          : [];
        return {
          id: q.id,
          section_key: "main",
          question_number: String(i + 1),
          prompt: q.prompt.trim(),
          question_type: isMcq ? "mcq" : q.qtype === "program" ? "program" : "theory",
          marks: q.marks,
          options,
          model_answer: isMcq ? (q.correctText.trim() || null) : (q.model_answer.trim() || null),
        };
      }),
    };
    setPending(true);
    const res = await saveExamStructureAction(examId, JSON.stringify(payload));
    setPending(false);
    setMsg({ ok: res.ok, text: res.ok ? "Questions saved." : res.error ?? "Save failed." });
    if (res.ok) {
      setEditing(null);
      router.refresh();
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-ink-800">Questions</h2>
          <p className="text-sm font-semibold text-ink-400">
            {list.length} question{list.length === 1 ? "" : "s"} · answers save in order
          </p>
        </div>
        {!frozen && (
          <Button size="sm" variant="secondary" onClick={() => { setList((l) => [...l, blank()]); setEditing(list[list.length - 1]?.key ?? null); }}>
            <Plus className="h-4 w-4" /> Add question
          </Button>
        )}
      </div>

      {frozen && (
        <p className="rounded-xl bg-sun-100 px-4 py-2 text-sm font-bold text-sun-500">
          This exam has student attempts — the question list is frozen.
        </p>
      )}

      <ol className="flex flex-col gap-3">
        {list.map((q, i) => {
          const isEditing = editing === q.key;
          return (
            <li key={q.key} className={`rounded-2xl border-2 p-4 transition-colors ${isEditing ? "border-lav-300 bg-lav-50/50" : "border-cream-300/60 bg-cream-100/60"}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-lav-100 text-sm font-extrabold text-lav-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={TYPE_TONE[q.qtype]}>{TYPE_LABEL[q.qtype]}</Chip>
                    <Chip tone="ink">{q.marks} mark{q.marks === 1 ? "" : "s"}</Chip>
                  </div>
                  {isEditing ? (
                    <div className="mt-3 flex flex-col gap-3">
                      <div>
                        <label className={labelCls}>Question text</label>
                        <textarea className={`${inputCls} min-h-20`} rows={3} value={q.prompt} disabled={frozen}
                          onChange={(e) => patch(q.key, { prompt: e.target.value })} placeholder="Type the full question…" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelCls}>Answer type</label>
                          <select className={inputCls} value={q.qtype} disabled={frozen}
                            onChange={(e) => patch(q.key, { qtype: e.target.value as QType })}>
                            <option value="mcq">MCQ</option>
                            <option value="program">Program</option>
                            <option value="paragraph">Paragraph</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Marks</label>
                          <input type="number" min={0.5} step={0.5} className={inputCls} value={q.marks} disabled={frozen}
                            onChange={(e) => patch(q.key, { marks: Number(e.target.value) })} />
                        </div>
                      </div>
                      {q.qtype === "mcq" && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelCls}>Options (separate with semicolons)</label>
                            <input className={inputCls} value={q.optionsText} disabled={frozen}
                              onChange={(e) => patch(q.key, { optionsText: e.target.value })}
                              placeholder="int; float; double; char" />
                          </div>
                          <div>
                            <label className={labelCls}>Correct answer</label>
                            <input className={inputCls} value={q.correctText} disabled={frozen}
                              onChange={(e) => patch(q.key, { correctText: e.target.value })}
                              placeholder="Must match one option exactly" />
                          </div>
                        </div>
                      )}
                      {(q.qtype === "program" || q.qtype === "paragraph") && (
                        <div>
                          <label className={labelCls}>Model answer / marking guide (optional)</label>
                          <textarea className={`${inputCls} font-mono text-xs`} rows={3} value={q.model_answer} disabled={frozen}
                            onChange={(e) => patch(q.key, { model_answer: e.target.value })}
                            placeholder="Ideal answer or key points for manual evaluation…" />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setEditing(null)} disabled={frozen}>
                          <Check className="h-4 w-4" /> Done
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink-600">{q.prompt || "(empty question)"}</p>
                      {!frozen && (
                        <div className="mt-2 flex items-center gap-1">
                          <button type="button" onClick={() => setEditing(q.key)} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-cream-200 hover:text-lav-500" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600 disabled:opacity-30" title="Move up">
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600 disabled:opacity-30" title="Move down">
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => remove(q.key)} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="rounded-2xl border-2 border-dashed border-cream-300 p-6 text-center text-sm font-bold text-ink-400">
            No questions yet — click “Add question” to start.
          </li>
        )}
      </ol>

      {!frozen && list.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t-2 border-cream-200 pt-4">
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save questions"}
          </Button>
          {msg && <span className={`text-sm font-bold ${msg.ok ? "text-mint-600" : "text-red-400"}`}>{msg.text}</span>}
        </div>
      )}
      {frozen && msg && <span className={`text-sm font-bold ${msg.ok ? "text-mint-600" : "text-red-400"}`}>{msg.text}</span>}
    </Card>
  );
}
