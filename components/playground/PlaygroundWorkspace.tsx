"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { runPlaygroundCodeAction } from "@/app/actions/playground";
import { emitRobotEvent } from "@/lib/mascot/events";
import { PLAYGROUND_STARTER_CODE } from "@/lib/coding/shared";
import {
  Play, RotateCcw, Trash2, FlaskConical, FileCode2, Terminal,
  CheckCircle2, AlertTriangle, CircleDot, Eraser,
} from "lucide-react";

const Editor = dynamic(() => import("@/components/coding/MonacoEditor").then((m) => m.MonacoEditor), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-sm text-neutral-400">Loading editor…</div>,
});

const EXAMPLES: Array<{ name: string; code: string }> = [
  {
    name: "Hello world",
    code: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Javoodle!");\n    }\n}\n`,
  },
  {
    name: "Loop & sum",
    code: `public class Main {\n    public static void main(String[] args) {\n        int sum = 0;\n        for (int i = 1; i <= 10; i++) {\n            sum += i;\n        }\n        System.out.println("Sum 1..10 = " + sum);\n    }\n}\n`,
  },
  {
    name: "Scanner input",
    code: PLAYGROUND_STARTER_CODE,
  },
  {
    name: "Array basics",
    code: `public class Main {\n    public static void main(String[] args) {\n        int[] marks = {85, 92, 78, 90};\n        for (int m : marks) {\n            System.out.println("Mark: " + m);\n        }\n    }\n}\n`,
  },
];

interface RunState {
  status: string; stdout: string; stderr: string;
  compileError: string | null; runtimeError: string | null;
  executionTimeMs: number | null; ok: boolean;
}

const emptyRun: RunState = { status: "", stdout: "", stderr: "", compileError: null, runtimeError: null, executionTimeMs: null, ok: false };

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  "": { label: "Ready", cls: "text-ink-400", icon: <CircleDot className="h-3.5 w-3.5" /> },
  running: { label: "Running…", cls: "text-lav-300", icon: <CircleDot className="h-3.5 w-3.5 animate-pulse" /> },
  success: { label: "Success", cls: "text-mint-300", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  compile_error: { label: "Compile error", cls: "text-red-400", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  runtime_error: { label: "Runtime error", cls: "text-red-400", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  time_limit: { label: "Time limit", cls: "text-sun-300", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  error: { label: "Error", cls: "text-red-400", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  unavailable: { label: "Unavailable", cls: "text-ink-400", icon: <CircleDot className="h-3.5 w-3.5" /> },
};

export function PlaygroundWorkspace() {
  const [code, setCode] = useState(PLAYGROUND_STARTER_CODE);
  const [stdin, setStdin] = useState("");
  const [run, setRun] = useState<RunState>(emptyRun);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<"editor" | "console">("editor");

  async function doRun() {
    if (running) return;
    setRunning(true); setMsg(null); setRun((r) => ({ ...r, status: "running" }));
    const res = await runPlaygroundCodeAction(code, stdin);
    setRunning(false);
    if (!res.ok && !["compile_error", "runtime_error", "time_limit", "success"].includes(res.status ?? "")) {
      setRun({ ...emptyRun, status: res.status ?? "error", runtimeError: res.error ?? "Run failed." });
      setMsg({ ok: false, text: res.error ?? "Could not run the code." });
      return;
    }
    setRun({
      status: res.status ?? "error", stdout: res.stdout ?? "", stderr: res.stderr ?? "",
      compileError: res.compileError ?? null, runtimeError: res.runtimeError ?? null,
      executionTimeMs: res.executionTimeMs ?? null, ok: !!res.ok,
    });
    emitRobotEvent(res.ok ? "happy" : "encouraging");
    setMsg(res.ok ? { ok: true, text: "Ran successfully — happy experimenting!" } : { ok: false, text: res.compileError ? "Compilation failed — check the errors below." : res.runtimeError ?? "Something went wrong — see the console." });
  }

  const meta = STATUS_META[run.status] ?? STATUS_META.error;
  const hasOutput = Boolean(run.stdout || run.stderr || run.compileError || run.runtimeError);

  return (
    <div data-keep-clear className="flex flex-col gap-4">
      {/* examples + onboarding hint */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-400">
          <FlaskConical className="h-3.5 w-3.5" /> Try an example
        </span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.name}
            onClick={() => { setCode(ex.code); setRun(emptyRun); setMsg(null); }}
            className="rounded-full bg-cream-100 px-3.5 py-1.5 text-xs font-extrabold text-ink-500 transition-colors hover:bg-lav-100 hover:text-lav-600"
          >
            {ex.name}
          </button>
        ))}
        <span className="ml-auto hidden text-xs font-semibold text-ink-400 sm:block">
          Pick an example → edit → add input if needed → Run.
        </span>
      </div>

      {/* Mobile tabs */}
      <div className="flex gap-2 lg:hidden">
        {(["editor", "console"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === t ? "bg-lav-100 text-lav-600" : "bg-cream-100 text-ink-400"}`}>
            {t === "editor" ? "Editor" : "Console"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {/* ===== editor region (~2/3) ===== */}
        <div className={`overflow-hidden rounded-card border border-cream-300/50 bg-cream-100/80 backdrop-blur-sm ${tab === "editor" ? "block" : "hidden lg:block"}`}>
          {/* toolbar / file tab */}
          <div className="flex flex-wrap items-center gap-2 border-b border-cream-300/40 bg-cream-200/40 px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-cream-300/40 bg-cream-100 px-3 py-1.5">
              <FileCode2 className="h-3.5 w-3.5 text-lav-400" />
              <span className="font-mono text-xs font-bold text-ink-600">Main.java</span>
              <span className="h-1.5 w-1.5 rounded-full bg-mint-400" title="Editor ready" />
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setCode(PLAYGROUND_STARTER_CODE)} title="Reset to starter"><RotateCcw className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Clear the editor?")) setCode(""); }} className="text-red-400" title="Clear"><Trash2 className="h-4 w-4" /></Button>
              <Button size="sm" onClick={doRun} loading={running} disabled={!code.trim() || running} className="shadow-[0_4px_0_#6d28d9] active:translate-y-0.5 active:shadow-none">
                <Play className="h-4 w-4" /> {running ? "Running…" : "Run code"}
              </Button>
            </div>
          </div>
          <div className="h-[420px] lg:h-[min(560px,52vh)]">
            <Editor height="100%" language="java" theme="vs-dark" value={code} onChange={(v) => setCode(v ?? "")} options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true, tabSize: 4, insertSpaces: true, scrollBeyondLastLine: false, padding: { top: 12 } }} />
          </div>
        </div>

        {/* ===== bottom region: stdin + console (~1/3) ===== */}
        <div className={`grid items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${tab === "console" ? "grid" : "hidden lg:grid"}`}>
          {/* stdin — compact */}
          <Card className="flex flex-col gap-2 p-4">
            <label htmlFor="pg-stdin" className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-400">
              <Terminal className="h-3.5 w-3.5" /> Standard input
            </label>
            <textarea
              id="pg-stdin"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={3}
              placeholder="What your program reads via Scanner…"
              className="w-full resize-y rounded-xl border border-cream-300/60 bg-cream-200/60 px-3 py-2 font-mono text-xs leading-relaxed text-ink-600 outline-none transition-colors placeholder:text-ink-400/60 focus:border-lav-300/70"
            />
            <p className="text-[11px] font-semibold text-ink-400">
              {stdin.trim() ? "Input will be sent with the next run." : "Optional — only needed if your code uses Scanner."}
            </p>
          </Card>

          {/* console */}
          <Card className="flex flex-col gap-2 bg-[#0a1120] p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-400">
                <Terminal className="h-3.5 w-3.5" /> Console
              </span>
              <span className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-[10px] font-extrabold ${meta.cls}`}>
                  {meta.icon} {meta.label}{run.executionTimeMs ? ` · ${run.executionTimeMs}ms` : ""}
                </span>
                {hasOutput && (
                  <button onClick={() => { setRun(emptyRun); setMsg(null); }} aria-label="Clear console" title="Clear console" className="text-ink-400 transition-colors hover:text-red-400">
                    <Eraser className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            </div>
            {msg && <p className={`rounded-xl px-3 py-2 text-xs font-bold ${msg.ok ? "bg-mint-400/15 text-mint-300" : "bg-red-400/15 text-red-300"}`}>{msg.text}</p>}
            {run.compileError && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-red-400/30 bg-red-500/10 p-3 font-mono text-xs text-red-300"><span className="font-extrabold text-red-400">Compilation error:</span>{"\n"}{run.compileError}</pre>}
            {run.runtimeError && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-red-400/30 bg-red-500/10 p-3 font-mono text-xs text-red-300"><span className="font-extrabold text-red-400">{run.status === "time_limit" ? "Time limit exceeded" : "Runtime error:"}</span>{"\n"}{run.runtimeError}</pre>}
            {run.stdout && <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-cream-200/40 p-3 font-mono text-xs leading-relaxed text-ink-500">{run.stdout}</pre>}
            {!hasOutput && run.status !== "running" && <p className="font-mono text-xs text-ink-400">Output will appear here…</p>}
            {run.status === "running" && <p className="font-mono text-xs text-lav-300">Executing…</p>}
          </Card>
        </div>
      </div>
      <p className="text-center text-[11px] font-semibold text-ink-400">
        Runs in an isolated sandbox on our compiler service — nothing is graded or stored as a submission.
      </p>
    </div>
  );
}
