"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Flag, Save, FileText, History } from "lucide-react";
import {
  setQuestionStatus, setAnswerStatus, updateQuestion, deleteQuestion,
} from "@/app/actions/admin-questions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

interface Props {
  question: {
    id: string; text: string; type: string; marks: number; difficulty: number;
    status: string; answer_status: string;
    correct_answer_text: string | null; explanation: string | null;
    ai_metadata: Record<string, unknown> | null;
    source_question_number: string | null; source_page: number | null;
    source_year: number | null; version: number; topic_id: string | null;
    topic_name: string | null;
  };
  options: { id: string; label: string; text: string; is_correct: boolean }[];
  testCases: { id: string; input: string; expected_output: string; is_hidden: boolean }[];
  rubrics: { id: string; criteria: string; max_marks: number; keywords: string[] }[];
  versions: { version: number; created_at: string }[];
  events: { event: string; actor: string; created_at: string; payload: Record<string, unknown> }[];
  sourceDoc: { filename: string; url: string | null } | null;
}

const input = "w-full rounded-lg border-2 border-cream-300 bg-white px-3 py-2 text-sm font-semibold text-ink-700 focus:border-lav-300 focus:outline-none";

export function QuestionEditor(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(p.question.text);
  const [answer, setAnswer] = useState(p.question.correct_answer_text ?? "");
  const [marks, setMarks] = useState(String(p.question.marks));
  const [explanation, setExplanation] = useState(p.question.explanation ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  const q = p.question;
  const meta = (q.ai_metadata ?? {}) as Record<string, unknown>;

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? okMsg : `Error: ${r.error}`);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* LEFT — source */}
      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-400">
            <FileText className="h-4 w-4" /> Source
          </h2>
          {p.sourceDoc ? (
            <>
              <p className="text-sm font-bold text-ink-600">{p.sourceDoc.filename}</p>
              <p className="text-xs font-semibold text-ink-400">
                {q.source_year ?? "?"} · page {q.source_page ?? "?"} · Q{q.source_question_number ?? "?"}
              </p>
              {p.sourceDoc.url && (
                <iframe src={p.sourceDoc.url} title="source document"
                  className="mt-3 h-[480px] w-full rounded-xl border border-cream-200 bg-white" />
              )}
            </>
          ) : (
            <p className="text-sm font-semibold text-ink-400">Imported via JSON — no source document linked.</p>
          )}
          {typeof meta.provenance === "object" && meta.provenance && (
            <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-cream-100 p-2 text-[10px] text-ink-500">
              {JSON.stringify(meta.provenance, null, 1)}
            </pre>
          )}
        </Card>
      </div>

      {/* RIGHT — extracted question + actions */}
      <div className="flex flex-col gap-4">
        <Card className="flex flex-wrap items-center gap-2 p-4">
          <Chip tone={q.status === "approved" ? "mint" : "sun"}>Q: {q.status.replace("_", " ")}</Chip>
          <Chip tone={q.answer_status === "approved" ? "mint" : "sun"}>A: {q.answer_status}</Chip>
          <Chip tone="ink">v{q.version}</Chip>
          <span className="ml-auto text-xs font-bold text-ink-400">
            {q.type} · {q.marks} marks · {q.topic_name ?? "no topic"} · difficulty {q.difficulty}
          </span>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <label className="text-xs font-bold uppercase tracking-wide text-ink-400">Question text</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className={input} />
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs font-bold uppercase tracking-wide text-ink-400">Marks
              <input value={marks} onChange={(e) => setMarks(e.target.value)} className={input} /></label>
            <label className="text-xs font-bold uppercase tracking-wide text-ink-400">Difficulty
              <input value={q.difficulty} disabled className={input} /></label>
            <label className="text-xs font-bold uppercase tracking-wide text-ink-400">Type
              <input value={q.type} disabled className={input} /></label>
          </div>
          <label className="text-xs font-bold uppercase tracking-wide text-ink-400">Correct answer / key</label>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} className={`${input} font-mono text-xs`} />
          <label className="text-xs font-bold uppercase tracking-wide text-ink-400">Explanation</label>
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className={input} />
          <Button size="sm" variant="secondary" disabled={pending}
            onClick={() => act(() => updateQuestion(q.id, {
              text, marks: Number(marks), correct_answer_text: answer || null,
              explanation: explanation || null,
            }), "Saved — new version created.")}>
            <Save className="h-4 w-4" /> Save edits (new version)
          </Button>
        </Card>

        {/* options / test cases / rubric */}
        {p.options.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-extrabold text-ink-600">Options</h3>
            <ul className="space-y-1 text-sm font-semibold text-ink-600">
              {p.options.map((o) => (
                <li key={o.id} className={o.is_correct ? "text-mint-600" : ""}>
                  <b>{o.label}.</b> {o.text} {o.is_correct && "✓"}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {p.testCases.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-extrabold text-ink-600">Test cases ({p.testCases.length})</h3>
            <ul className="space-y-1 text-xs font-mono text-ink-500">
              {p.testCases.map((t) => (
                <li key={t.id}>in: {t.input || "∅"} → out: {t.expected_output} {t.is_hidden && "🔒"}</li>
              ))}
            </ul>
          </Card>
        )}
        {p.rubrics.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-extrabold text-ink-600">Marking rubric</h3>
            <ul className="space-y-1 text-sm font-semibold text-ink-600">
              {p.rubrics.map((r) => <li key={r.id}>{r.criteria} — {Number(r.max_marks)}m</li>)}
            </ul>
          </Card>
        )}
        {typeof meta.model_answer === "string" && (
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-extrabold text-ink-600">AI model answer</h3>
            <pre className="whitespace-pre-wrap text-xs text-ink-500">{String(meta.model_answer)}</pre>
            {typeof meta.reference_solution === "string" && (
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-900 p-3 text-xs text-mint-100">{String(meta.reference_solution)}</pre>
            )}
          </Card>
        )}

        {/* actions */}
        <Card className="flex flex-col gap-3 p-4">
          <h3 className="text-sm font-extrabold text-ink-600">Review actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={() => act(() => setQuestionStatus(q.id, "approved"), "Question approved.")}>
              <Check className="h-4 w-4" /> Approve question
            </Button>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => setQuestionStatus(q.id, "rejected", "manual"), "Question rejected.")}>
              <X className="h-4 w-4" /> Reject question
            </Button>
            <Button size="sm" variant="mint" disabled={pending} onClick={() => act(() => setAnswerStatus(q.id, "approved"), "Answer approved.")}>
              <Check className="h-4 w-4" /> Approve answer
            </Button>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => setAnswerStatus(q.id, "rejected", "manual"), "Answer rejected.")}>
              <X className="h-4 w-4" /> Reject answer
            </Button>
            <Button size="sm" variant="sun" disabled={pending} onClick={() => act(() => setQuestionStatus(q.id, "needs_revision"), "Flagged for revision.")}>
              <Flag className="h-4 w-4" /> Needs revision
            </Button>
            <Button size="sm" variant="ghost" disabled={pending}
              onClick={() => { if (confirm("Delete this question permanently?")) act(() => deleteQuestion(q.id), "Deleted."); }}>
              Delete
            </Button>
          </div>
          {msg && <p className="text-sm font-semibold text-ink-500">{msg}</p>}
        </Card>

        {/* history */}
        <Card className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink-600">
            <History className="h-4 w-4" /> History
          </h3>
          <p className="mb-1 text-xs font-bold text-ink-400">Versions: {p.versions.map((v) => `v${v.version}`).join(", ") || "none"}</p>
          <ul className="max-h-40 space-y-1 overflow-auto text-xs font-semibold text-ink-400">
            {p.events.map((e, i) => (
              <li key={i}>{new Date(e.created_at).toLocaleString()} — {e.event} by {e.actor}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
