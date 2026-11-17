"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { runCodingCodeAction, submitCodingSolutionAction } from "@/app/actions/coding-student";
import { DIFFICULTY_LABELS, type CodingDifficulty } from "@/lib/coding/shared";
import { Play, Send, RotateCcw, Trash2 } from "lucide-react";

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-sm text-neutral-400">Loading editor…</div>,
});

interface Q {
  id: string; title: string; description: string; problem_statement: string;
  input_format: string; output_format: string; constraints: string; hints: string;
  starter_code: string; marks: number; difficulty: CodingDifficulty;
  topic: string; time_recommendation_minutes: number | null;
  sample_cases: Array<{ id: string; input_data: string; expected_output: string }>;
}

interface RunState {
  status: string; stdout: string; stderr: string;
  compileError: string | null; runtimeError: string | null;
  executionTimeMs: number | null; sourceHash: string | null; ok: boolean;
}

const emptyRun: RunState = { status: "", stdout: "", stderr: "", compileError: null, runtimeError: null, executionTimeMs: null, sourceHash: null, ok: false };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink-400">{title}</h3>
      <div className="mt-1 whitespace-pre-wrap text-sm font-semibold text-ink-600">{children}</div>
    </div>
  );
}

export function CodingWorkspace({ question, priorSubmissions }: { question: Q; priorSubmissions: Array<{ id: string; attempt_number: number; review_status: string; marks_awarded: number | null; feedback: string | null; created_at: string }> }) {
  const [code, setCode] = useState(question.starter_code || "public class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n");
  const [stdin, setStdin] = useState("");
  const [run, setRun] = useState<RunState>(emptyRun);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<"question" | "editor">("question");

  const canSubmit = run.ok && run.sourceHash !== null;
  

  async function doRun() {
    setRunning(true); setMsg(null);
    const res = await runCodingCodeAction(question.id, code, stdin);
    setRunning(false);
    if (!res.ok && res.status !== "compile_error" && res.status !== "runtime_error" && res.status !== "time_limit") {
      setRun({ ...emptyRun, status: res.status ?? "error", runtimeError: res.error ?? res.runtimeError ?? "Run failed." });
      setMsg({ ok: false, text: res.error ?? "Could not run the code." });
      return;
    }
    setRun({
      status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "",
      compileError: res.compileError ?? null, runtimeError: res.runtimeError ?? null,
      executionTimeMs: res.executionTimeMs ?? null, sourceHash: res.sourceHash ?? null, ok: !!res.ok,
    });
    setMsg(res.ok ? { ok: true, text: "Ran successfully — check the output below." } : { ok: false, text: res.compileError ? "Compilation failed — see errors below." : res.runtimeError ?? "Runtime problem — see console." });
  }

  async function doSubmit() {
    if (!run.sourceHash) return;
    setSubmitting(true); setMsg(null);
    const res = await submitCodingSolutionAction(question.id, code, run.sourceHash);
    setSubmitting(false);
    setMsg(res.ok ? { ok: true, text: "Solution submitted for review. Your teacher will check it soon!" } : { ok: false, text: res.error ?? "Submit failed." });
  }

  const statusColor = run.status === "success" ? "text-mint-600" : run.status ? "text-red-500" : "text-ink-400";

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile tabs */}
      <div className="flex gap-2 lg:hidden">
        {(["question", "editor"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === t ? "bg-lav-100 text-lav-600" : "bg-cream-100 text-ink-400"}`}>
            {t === "question" ? "Question" : "Editor"}
          </button>
        ))}
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
        {/* LEFT — question */}
        <Card className={`flex-col gap-4 overflow-y-auto p-5 lg:max-h-[calc(100dvh-160px)] ${tab === "question" ? "flex" : "hidden lg:flex"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="lav">{question.title}</Chip>
            <Chip tone={question.difficulty === "easy" ? "mint" : question.difficulty === "hard" ? "lav" : "sun"}>{DIFFICULTY_LABELS[question.difficulty]}</Chip>
            <Chip tone="ink">{Number(question.marks)} marks</Chip>
            {question.topic && <Chip tone="mint">{question.topic}</Chip>}
            {question.time_recommendation_minutes && <Chip tone="sun">~{question.time_recommendation_minutes} min</Chip>}
          </div>
          {question.description && <p className="text-sm font-semibold text-ink-600">{question.description}</p>}
          <Section title="Problem">{question.problem_statement}</Section>
          <Section title="Input format">{question.input_format}</Section>
          <Section title="Output format">{question.output_format}</Section>
          <Section title="Constraints">{question.constraints}</Section>
          {question.sample_cases.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink-400">Sample cases</h3>
              <div className="mt-2 flex flex-col gap-2">
                {question.sample_cases.map((c) => (
                  <div key={c.id} className="rounded-xl bg-cream-50 p-3 font-mono text-xs">
                    <p className="font-bold text-ink-500">Input:</p><pre className="whitespace-pre-wrap">{c.input_data}</pre>
                    <p className="mt-1 font-bold text-ink-500">Expected output:</p><pre className="whitespace-pre-wrap">{c.expected_output}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Section title="Hints">{question.hints}</Section>
          {priorSubmissions.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink-400">Your submissions</h3>
              <ul className="mt-1 text-sm font-semibold text-ink-500">
                {priorSubmissions.map((s) => (
                  <li key={s.id}>Attempt {s.attempt_number} — {s.review_status}{s.marks_awarded !== null ? ` · ${s.marks_awarded} marks` : ""}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* RIGHT — editor + console */}
        <div className={`flex flex-col gap-3 ${tab === "editor" ? "flex" : "hidden lg:flex"}`}>
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-cream-200 px-3 py-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-ink-400">Java editor</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setCode(question.starter_code)} title="Reset to starter code"><RotateCcw className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Clear the editor?")) setCode(""); }} className="text-red-500" title="Clear"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="h-[420px] lg:h-[min(560px,calc(100dvh-280px))]">
              <Editor height="100%" language="java" theme="vs-dark" value={code} onChange={(v) => setCode(v ?? "")} options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true, tabSize: 4, insertSpaces: true }} />
            </div>
          </Card>

          <Card className="p-3">
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-400">Standard input (stdin)</label>
            <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={3} placeholder="Input your program reads (optional)…" className="w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3 py-2 font-mono text-xs text-ink-700 outline-none focus:border-lav-300" />
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={doRun} disabled={running || !code.trim()}><Play className="h-4 w-4" /> {running ? "Running…" : "Run Code"}</Button>
            <Button variant="mint" onClick={doSubmit} disabled={submitting || !canSubmit} title={canSubmit ? "" : "Run your code successfully first"}>
              <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit Solution"}
            </Button>
          </div>
          {!canSubmit && run.status !== "success" && (
            <p className="text-xs font-semibold text-ink-400">Run your code successfully to enable Submit — a successful run does not mean the answer is correct.</p>
          )}
          {msg && <p className={`rounded-xl px-4 py-2 text-sm font-bold ${msg.ok ? "bg-mint-100 text-mint-600" : "bg-red-500/10 text-red-400"}`}>{msg.text}</p>}

          {/* Console */}
          <Card className="flex flex-col gap-2 bg-[#1e1e1e] p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-400">Console</span>
              {run.status && <span className={`text-xs font-bold ${statusColor}`}>{run.status}{run.executionTimeMs ? ` · ${run.executionTimeMs}ms` : ""}</span>}
            </div>
            {run.compileError && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950/60 p-3 font-mono text-xs text-red-300"><span className="font-bold">Compilation error:</span>{"\n"}{run.compileError}</pre>}
            {run.runtimeError && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950/60 p-3 font-mono text-xs text-red-300"><span className="font-bold">{run.status === "time_limit" ? "Time limit exceeded" : "Runtime error:"}</span>{"\n"}{run.runtimeError}</pre>}
            {run.stdout && <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-800 p-3 font-mono text-xs text-neutral-200">{run.stdout}</pre>}
            {!run.status && <p className="font-mono text-xs text-neutral-500">Output will appear here…</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
