"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { runCodingCodeAction, submitCodingSolutionAction } from "@/app/actions/coding-student";
import { emitRobotEvent } from "@/lib/mascot/events";
import { DIFFICULTY_LABELS, type CodingDifficulty } from "@/lib/coding/shared";
import {
  Play, Send, RotateCcw, Trash2, ChevronDown, ChevronUp,
  FileCode2, AlertTriangle, CheckCircle2, CircleDot, Terminal,
} from "lucide-react";

const Editor = dynamic(() => import("@/components/coding/MonacoEditor").then((m) => m.MonacoEditor), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-[#0d1528] text-sm text-ink-400">Loading editor…</div>,
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

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-400">{title}</h3>
        {action}
      </div>
      <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-ink-500">{children}</div>
    </div>
  );
}

function IoBlock({ label, value, tone }: { label: string; value: string; tone: "in" | "out" }) {
  return (
    <div className="overflow-hidden rounded-xl border border-cream-300/50">
      <p className={`border-b border-cream-300/40 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${tone === "in" ? "bg-lav-100/60 text-lav-300" : "bg-mint-100/50 text-mint-300"}`}>
        {label}
      </p>
      <pre className="overflow-x-auto bg-cream-200/50 p-3 font-mono text-xs leading-relaxed text-ink-500">{value}</pre>
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
  const [consoleOpen, setConsoleOpen] = useState(true);

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
    emitRobotEvent(res.ok ? "happy" : res.status === "compile_error" || res.status === "runtime_error" ? "encouraging" : "thinking");
    setMsg(res.ok ? { ok: true, text: "Ran successfully — check the output below." } : { ok: false, text: res.compileError ? "Compilation failed — see errors below." : res.runtimeError ?? "Runtime problem — see console." });
  }

  async function doSubmit() {
    if (!run.sourceHash) return;
    setSubmitting(true); setMsg(null);
    const res = await submitCodingSolutionAction(question.id, code, run.sourceHash);
    setSubmitting(false);
    if (res.ok) emitRobotEvent("celebrating");
    setMsg(res.ok ? { ok: true, text: "Solution submitted for review. Your teacher will check it soon!" } : { ok: false, text: res.error ?? "Submit failed." });
  }

  const statusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    success: { label: "Success", cls: "text-mint-300", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    compile_error: { label: "Compile error", cls: "text-red-400", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    runtime_error: { label: "Runtime error", cls: "text-red-400", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    time_limit: { label: "Time limit", cls: "text-sun-300", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    error: { label: "Error", cls: "text-red-400", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    unavailable: { label: "Unavailable", cls: "text-ink-400", icon: <CircleDot className="h-3.5 w-3.5" /> },
  };
  const meta = run.status ? statusMeta[run.status] ?? statusMeta.error : null;
  const hasConsole = Boolean(run.status);

  return (
    <div data-keep-clear className="flex flex-col gap-4">
      {/* Mobile tabs */}
      <div className="flex gap-2 lg:hidden">
        {(["question", "editor"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${tab === t ? "bg-lav-100 text-lav-300" : "bg-cream-100 text-ink-400 hover:text-ink-500"}`}>
            {t === "question" ? "Question" : "Editor"}
          </button>
        ))}
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-[44fr_56fr]">
        {/* LEFT — problem */}
        <div className={`flex-col overflow-hidden rounded-card border border-cream-300/50 bg-cream-100/80 backdrop-blur-sm ${tab === "question" ? "flex" : "hidden lg:flex"}`}>
          <div className="border-b border-cream-300/40 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="lav">{question.title}</Chip>
              <Chip tone={question.difficulty === "easy" ? "mint" : question.difficulty === "hard" ? "lav" : "sun"}>{DIFFICULTY_LABELS[question.difficulty]}</Chip>
              <Chip tone="ink">{Number(question.marks)} marks</Chip>
              {question.topic && <Chip tone="mint">{question.topic}</Chip>}
              {question.time_recommendation_minutes && <Chip tone="sun">~{question.time_recommendation_minutes} min</Chip>}
            </div>
          </div>
          <div className="flex flex-col gap-5 overflow-y-auto p-5 lg:max-h-[calc(100dvh-220px)]">
            {question.description && <p className="text-sm font-semibold leading-relaxed text-ink-500">{question.description}</p>}
            <Panel title="Problem statement">{question.problem_statement}</Panel>
            <Panel title="Input format">{question.input_format}</Panel>
            <Panel title="Output format">{question.output_format}</Panel>
            <Panel title="Constraints">{question.constraints}</Panel>

            {question.sample_cases.length > 0 && (
              <div>
                <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Sample cases</h3>
                <div className="flex flex-col gap-3">
                  {question.sample_cases.map((c) => (
                    <div key={c.id} className="flex flex-col gap-2">
                      <IoBlock label="Input" value={c.input_data} tone="in" />
                      <IoBlock label="Expected output" value={c.expected_output} tone="out" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Panel title="Hints">{question.hints}</Panel>

            {priorSubmissions.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Your submissions</h3>
                <ul className="flex flex-col gap-1.5 text-sm font-semibold text-ink-500">
                  {priorSubmissions.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 rounded-lg bg-cream-200/50 px-3 py-1.5">
                      <CircleDot className="h-3.5 w-3.5 text-lav-300" />
                      Attempt {s.attempt_number} — {s.review_status}{s.marks_awarded !== null ? ` · ${s.marks_awarded} marks` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — workspace */}
        <div className={`flex flex-col gap-3 ${tab === "editor" ? "flex" : "hidden lg:flex"}`}>
          {/* editor panel with file tab */}
          <div className="overflow-hidden rounded-card border border-cream-300/50 bg-cream-100/80 backdrop-blur-sm">
            <div className="flex items-center gap-1 border-b border-cream-300/40 bg-cream-200/40 px-2 pt-1.5">
              <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-cream-300/40 bg-cream-100 px-3.5 py-1.5">
                <FileCode2 className="h-3.5 w-3.5 text-lav-300" />
                <span className="font-mono text-xs font-bold text-ink-600">Main.java</span>
                <span className="h-1.5 w-1.5 rounded-full bg-mint-300" title="File saved locally" />
              </div>
              <div className="ml-auto flex items-center gap-0.5 pb-1">
                <Button size="sm" variant="ghost" onClick={() => setCode(question.starter_code)} title="Reset to starter code" className="!px-2.5"><RotateCcw className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Clear the editor?")) setCode(""); }} className="!px-2.5 text-red-400" title="Clear"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="h-[380px] lg:h-[min(520px,calc(100dvh-300px))]">
              <Editor height="100%" language="java" theme="vs-dark" value={code} onChange={(v) => setCode(v ?? "")} options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true, tabSize: 4, insertSpaces: true, scrollBeyondLastLine: false, padding: { top: 12 } }} />
            </div>
          </div>

          {/* stdin */}
          <div className="rounded-card border border-cream-300/50 bg-cream-100/80 p-3.5 backdrop-blur-sm">
            <label htmlFor="coding-stdin" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Standard input (stdin)</label>
            <textarea
              id="coding-stdin"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={3}
              placeholder="Input your program reads (optional)…"
              className="w-full resize-y rounded-xl border border-cream-300/60 bg-cream-200/60 px-3.5 py-2.5 font-mono text-xs leading-relaxed text-ink-600 outline-none transition-colors placeholder:text-ink-400/60 focus:border-lav-300/70 focus:bg-cream-200"
            />
          </div>

          {/* controls */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={doRun} loading={running} disabled={!code.trim()} className="shadow-[0_5px_0_#6d28d9] active:translate-y-0.5 active:shadow-none">
              <Play className="h-4 w-4" /> {running ? "Running…" : "Run Code"}
            </Button>
            <Button variant="mint" onClick={doSubmit} loading={submitting} disabled={!canSubmit} title={canSubmit ? "Submit your solution for teacher review" : "Run your code successfully first"} className="shadow-[0_5px_0_#059669] active:translate-y-0.5 active:shadow-none">
              <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit Solution"}
            </Button>
            {msg && (
              <p className={`text-xs font-bold ${msg.ok ? "text-mint-300" : "text-red-400"}`} role="status">{msg.text}</p>
            )}
          </div>
          {!canSubmit && run.status !== "success" && (
            <p className="text-xs font-semibold text-ink-400">
              Run your code successfully to enable Submit — a successful run does not mean the answer is correct.
            </p>
          )}

          {/* console */}
          <div className="overflow-hidden rounded-card border border-cream-300/50 bg-[#0a1120] backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setConsoleOpen((o) => !o)}
              className="flex w-full items-center gap-2 border-b border-cream-300/30 px-4 py-2.5 text-left transition-colors hover:bg-cream-100/40"
              aria-expanded={consoleOpen}
            >
              <Terminal className="h-3.5 w-3.5 text-ink-400" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Console</span>
              {meta && (
                <span className={`ml-1 flex items-center gap-1 text-[10px] font-extrabold ${meta.cls}`}>
                  {meta.icon} {meta.label}{run.executionTimeMs ? ` · ${run.executionTimeMs}ms` : ""}
                </span>
              )}
              <span className="ml-auto text-ink-400">
                {consoleOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>
            {consoleOpen && (
              <div className="flex max-h-72 flex-col gap-2.5 overflow-y-auto p-4">
                {!hasConsole && <p className="font-mono text-xs text-ink-400">Output will appear here…</p>}
                {run.compileError && (
                  <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-red-400/30 bg-red-500/10 p-3 font-mono text-xs leading-relaxed text-red-300"><span className="font-extrabold text-red-400">Compilation error:</span>{"\n"}{run.compileError}</pre>
                )}
                {run.runtimeError && (
                  <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-red-400/30 bg-red-500/10 p-3 font-mono text-xs leading-relaxed text-red-300"><span className="font-extrabold text-red-400">{run.status === "time_limit" ? "Time limit exceeded" : "Runtime error:"}</span>{"\n"}{run.runtimeError}</pre>
                )}
                {run.stdout && (
                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-cream-200/40 p-3 font-mono text-xs leading-relaxed text-ink-500">{run.stdout}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
