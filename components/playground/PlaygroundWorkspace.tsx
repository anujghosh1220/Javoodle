"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { runPlaygroundCodeAction } from "@/app/actions/playground";
import { emitRobotEvent } from "@/lib/mascot/events";
import { PLAYGROUND_STARTER_CODE } from "@/lib/coding/shared";
import { Play, RotateCcw, Trash2, FlaskConical } from "lucide-react";

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

export function PlaygroundWorkspace() {
  const [code, setCode] = useState(PLAYGROUND_STARTER_CODE);
  const [stdin, setStdin] = useState("");
  const [run, setRun] = useState<RunState>(emptyRun);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<"editor" | "console">("editor");

  async function doRun() {
    setRunning(true); setMsg(null);
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

  const statusColor = run.status === "success" ? "text-mint-600" : run.status ? "text-red-500" : "text-ink-400";

  return (
    <div data-keep-clear className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-400">
          <FlaskConical className="h-3.5 w-3.5" /> Examples
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
      </div>

      {/* Mobile tabs */}
      <div className="flex gap-2 lg:hidden">
        {(["editor", "console"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === t ? "bg-lav-100 text-lav-600" : "bg-cream-100 text-ink-400"}`}>
            {t === "editor" ? "Editor" : "Console"}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className={`overflow-hidden p-0 ${tab === "editor" ? "block" : "hidden lg:block"}`}>
          <div className="flex items-center justify-between border-b border-cream-200 px-3 py-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-ink-400">Java playground</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setCode(PLAYGROUND_STARTER_CODE)} title="Reset to starter"><RotateCcw className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Clear the editor?")) setCode(""); }} className="text-red-500" title="Clear"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="h-[380px] lg:h-[480px]">
            <Editor height="100%" language="java" theme="vs-dark" value={code} onChange={(v) => setCode(v ?? "")} options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true, tabSize: 4, insertSpaces: true }} />
          </div>
          <div className="border-t border-cream-200 p-3">
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-ink-400">Standard input (stdin)</label>
            <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={2} placeholder="Input your program reads (optional)…" className="w-full rounded-xl border-2 border-cream-300 bg-cream-200 px-3 py-2 font-mono text-xs text-ink-700 outline-none focus:border-lav-300" />
          </div>
          <div className="flex items-center gap-2 border-t border-cream-200 p-3">
            <Button onClick={doRun} loading={running} disabled={!code.trim()}>
              <Play className="h-4 w-4" /> {running ? "Running…" : "Run code"}
            </Button>
            <span className="text-xs font-semibold text-ink-400">Runs in an isolated sandbox — nothing is submitted.</span>
          </div>
        </Card>

        <Card className={`flex-col gap-2 bg-[#1e1e1e] p-4 text-sm ${tab === "console" ? "flex" : "hidden lg:flex"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-400">Console</span>
            {run.status && <span className={`text-xs font-bold ${statusColor}`}>{run.status}{run.executionTimeMs ? ` · ${run.executionTimeMs}ms` : ""}</span>}
          </div>
          {msg && <p className={`rounded-xl px-3 py-2 text-xs font-bold ${msg.ok ? "bg-mint-400/15 text-mint-300" : "bg-red-400/15 text-red-300"}`}>{msg.text}</p>}
          {run.compileError && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950/60 p-3 font-mono text-xs text-red-300"><span className="font-bold">Compilation error:</span>{"\n"}{run.compileError}</pre>}
          {run.runtimeError && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950/60 p-3 font-mono text-xs text-red-300"><span className="font-bold">{run.status === "time_limit" ? "Time limit exceeded" : "Runtime error:"}</span>{"\n"}{run.runtimeError}</pre>}
          {run.stdout && <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-800 p-3 font-mono text-xs text-neutral-200">{run.stdout}</pre>}
          {!run.status && <p className="font-mono text-xs text-neutral-500">Output will appear here…</p>}
        </Card>
      </div>
    </div>
  );
}
