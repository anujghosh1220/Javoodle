"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { saveCodingQuestionAction, setCodingQuestionStatusAction, deleteCodingQuestionAction } from "@/app/actions/coding-admin";
import { DIFFICULTY_LABELS, DIFFICULTIES, type CodingDifficulty } from "@/lib/coding/shared";
import { Plus, Trash2, ChevronDown } from "lucide-react";

const inputCls = "w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-lav-300";
const labelCls = "mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-400";

/** Derive a friendly title from the question text when none is given. */
export function autoTitle(text: string): string {
  const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  const cleaned = firstLine.replace(/^[#*\->\d.)\s]+/, "").trim();
  const short = cleaned.length > 70 ? `${cleaned.slice(0, 70).trimEnd()}…` : cleaned;
  return short || "Untitled coding question";
}

export interface CodingQuestionFormValues {
  title: string;
  question: string;
  marks: number;
  difficulty: CodingDifficulty;
  topic: string;
  time: number | null;
  hints: string;
  starter_code: string;
}

export function buildQuestionPayload(v: CodingQuestionFormValues) {
  return {
    title: v.title.trim() || autoTitle(v.question),
    description: "",
    problem_statement: v.question,
    input_format: "",
    output_format: "",
    constraints: "",
    hints: v.hints,
    starter_code: v.starter_code,
    marks: v.marks,
    difficulty: v.difficulty,
    topic: v.topic.trim(),
    time_recommendation_minutes: v.time,
  };
}

export function CodingQuestionFields({
  values, onChange, showTestCases, testCases, onTestCasesChange,
}: {
  values: CodingQuestionFormValues;
  onChange: (v: CodingQuestionFormValues) => void;
  showTestCases?: boolean;
  testCases?: Array<{ kind: "sample" | "hidden"; input_data: string; expected_output: string; weight: number }>;
  onTestCasesChange?: (c: NonNullable<typeof testCases>) => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  const set = (p: Partial<CodingQuestionFormValues>) => onChange({ ...values, ...p });
  const cases = testCases ?? [];
  const patchCase = (i: number, p: Partial<(typeof cases)[number]>) =>
    onTestCasesChange?.(cases.map((c, j) => (j === i ? { ...c, ...p } : c)));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Question title <span className="normal-case text-ink-300">(optional)</span></label>
        <input value={values.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Reverse a number" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Your question</label>
        <textarea
          value={values.question}
          onChange={(e) => set({ question: e.target.value })}
          rows={10}
          placeholder={"Paste or write the complete question here — problem description, input/output instructions, constraints, examples…"}
          className={`${inputCls} font-mono text-[13px] leading-relaxed`}
          required
        />
        <p className="mt-1 text-xs font-semibold text-ink-400">Everything the student needs goes here. You can split it into sections with headings.</p>
      </div>

      <button type="button" onClick={() => setAdvanced((v) => !v)} className="flex w-fit items-center gap-1.5 rounded-full bg-cream-100 px-4 py-1.5 text-sm font-bold text-ink-500 hover:bg-lav-100 hover:text-lav-600">
        <ChevronDown className={`h-4 w-4 transition-transform ${advanced ? "rotate-180" : ""}`} /> Advanced settings
      </button>

      {advanced && (
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-50/60 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Marks</label>
              <input type="number" min={0.5} step={0.5} value={values.marks} onChange={(e) => set({ marks: Number(e.target.value) || 10 })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Difficulty</label>
              <select value={values.difficulty} onChange={(e) => set({ difficulty: e.target.value as CodingDifficulty })} className={inputCls}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Suggested time (min)</label>
              <input type="number" min={1} value={values.time ?? ""} onChange={(e) => set({ time: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Topic / chapter <span className="normal-case text-ink-300">(optional)</span></label>
            <input value={values.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="e.g. Loops, Strings, Arrays" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Hints <span className="normal-case text-ink-300">(optional)</span></label>
            <textarea value={values.hints} onChange={(e) => set({ hints: e.target.value })} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Java starter code <span className="normal-case text-ink-300">(optional)</span></label>
            <textarea value={values.starter_code} onChange={(e) => set({ starter_code: e.target.value })} rows={6} className={`${inputCls} font-mono text-xs`} placeholder={"public class Main {\n    public static void main(String[] args) {\n    }\n}"} />
          </div>

          {showTestCases && onTestCasesChange && (
            <div>
              <label className={labelCls}>Test cases <span className="normal-case text-ink-300">(optional — hidden cases are never shown to students)</span></label>
              <div className="flex flex-col gap-3">
                {cases.map((c, i) => (
                  <div key={i} className="rounded-xl bg-cream-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={c.kind} onChange={(e) => patchCase(i, { kind: e.target.value as "sample" | "hidden" })} className={`${inputCls} w-32`}>
                        <option value="sample">Sample</option><option value="hidden">Hidden</option>
                      </select>
                      <input type="number" min={0.5} step={0.5} value={c.weight} onChange={(e) => patchCase(i, { weight: Number(e.target.value) })} className={`${inputCls} w-20`} title="Weight" />
                      <Button size="sm" variant="ghost" onClick={() => onTestCasesChange(cases.filter((_, j) => j !== i))} className="ml-auto text-red-500"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <textarea rows={2} placeholder="Input" value={c.input_data} onChange={(e) => patchCase(i, { input_data: e.target.value })} className={`${inputCls} font-mono text-xs`} />
                      <textarea rows={2} placeholder="Expected output" value={c.expected_output} onChange={(e) => patchCase(i, { expected_output: e.target.value })} className={`${inputCls} font-mono text-xs`} />
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="secondary" className="w-fit" onClick={() => onTestCasesChange([...cases, { kind: "sample", input_data: "", expected_output: "", weight: 1 }])}>
                  <Plus className="h-4 w-4" /> Add test case
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CodingQuestionsClient({ questions }: { questions: Array<{ id: string; title: string; marks: number; difficulty: CodingDifficulty; topic: string; status: string; coding_question_test_cases?: unknown[] }> }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState<CodingQuestionFormValues>({ title: "", question: "", marks: 10, difficulty: "medium", topic: "", time: null, hints: "", starter_code: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!values.question.trim()) { setMsg({ ok: false, text: "Please write your question first." }); return; }
    setBusy(true); setMsg(null);
    const res = await saveCodingQuestionAction(null, JSON.stringify({ ...buildQuestionPayload(values), status: "draft" }));
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: `Draft created: "${autoTitle(values.question)}"` });
      setValues({ title: "", question: "", marks: 10, difficulty: "medium", topic: "", time: null, hints: "", starter_code: "" });
      setShowForm(false); router.refresh();
    } else setMsg({ ok: false, text: res.error ?? "Failed." });
  }

  async function status(id: string, s: "draft" | "published" | "archived") {
    await setCodingQuestionStatusAction(id, s); router.refresh();
  }
  async function del(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"?`)) return;
    await deleteCodingQuestionAction(id); router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-800">Coding Questions</h1>
          <p className="mt-1 text-sm font-semibold text-ink-400">{questions.length} question{questions.length === 1 ? "" : "s"} · <Link href="/admin/coding/submissions" className="text-lav-500 hover:underline">Review submissions →</Link></p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}><Plus className="h-4 w-4" /> New question</Button>
      </div>
      {msg && <p className={`rounded-xl px-4 py-2 text-sm font-bold ${msg.ok ? "bg-mint-100 text-mint-600" : "bg-red-500/10 text-red-400"}`}>{msg.text}</p>}

      {showForm && (
        <Card className="p-6">
          <h2 className="font-extrabold text-ink-700">New coding question</h2>
          <form onSubmit={create} className="mt-4">
            <CodingQuestionFields values={values} onChange={setValues} />
            <div className="mt-5"><Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create draft"}</Button></div>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {questions.map((q) => (
          <Card key={q.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/admin/coding/${q.id}`} className="font-extrabold text-ink-800 hover:text-lav-500">{q.title}</Link>
              <p className="text-xs font-bold text-ink-400">{q.topic || "General"} · {Number(q.marks)} marks · {q.coding_question_test_cases?.length ?? 0} test cases</p>
            </div>
            <Chip tone={q.difficulty === "easy" ? "mint" : q.difficulty === "hard" ? "lav" : "sun"}>{DIFFICULTY_LABELS[q.difficulty]}</Chip>
            <Chip tone={q.status === "published" ? "mint" : q.status === "archived" ? "ink" : "sun"}>{q.status}</Chip>
            <div className="flex gap-1">
              {q.status !== "published" && <Button size="sm" variant="secondary" onClick={() => status(q.id, "published")}>Publish</Button>}
              {q.status === "published" && <Button size="sm" variant="secondary" onClick={() => status(q.id, "draft")}>Unpublish</Button>}
              {q.status !== "archived" && <Button size="sm" variant="ghost" onClick={() => status(q.id, "archived")}>Archive</Button>}
              <Button size="sm" variant="ghost" onClick={() => del(q.id, q.title)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
        {questions.length === 0 && <p className="text-sm font-semibold text-ink-400">No coding questions yet — create your first one above.</p>}
      </div>
    </div>
  );
}
