"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { submitMissionAction, type MissionResult } from "@/app/actions/missions";
import { emitRobotEvent } from "@/lib/mascot/events";
import { emitExperience } from "@/lib/experience/events";
import type { Mission } from "@/lib/missions/catalogue";
import { Lightbulb, Send, RotateCcw, CheckCircle2, XCircle, Trophy } from "lucide-react";

const Editor = dynamic(() => import("@/components/coding/MonacoEditor").then((m) => m.MonacoEditor), {
  ssr: false,
  loading: () => <div className="flex h-64 items-center justify-center rounded-xl bg-cream-200 text-sm font-bold text-ink-400">Loading editor…</div>,
});

export function MissionWorkspace({ mission, alreadyCompleted }: { mission: Mission; alreadyCompleted: boolean }) {
  const [code, setCode] = useState(mission.starterCode);
  const [hintIdx, setHintIdx] = useState(0);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setResult(null);
    emitExperience({ type: "code.execution.started" });
    emitExperience({ type: "mission.started", missionId: mission.id });
    const res = await submitMissionAction(mission.id, code);
    setSubmitting(false);
    setResult(res);
    if (res.ok) {
      emitExperience({ type: "code.execution.succeeded" });
      emitExperience({ type: "mission.completed", missionId: mission.id, xp: res.xpAwarded ?? 0 });
      emitExperience({ type: "xp.awarded", amount: res.xpAwarded ?? 0, source: "mission" });
      emitRobotEvent(res.alreadyCompleted ? "happy" : "celebrating");
    } else {
      emitExperience({ type: "code.execution.failed" });
      emitRobotEvent("encouraging");
    }
  }


  return (
    <div className="flex flex-col gap-4">
      {/* briefing + hints */}
      <Card className="p-5">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-ink-400">Mission briefing</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-600">{mission.briefing}</p>
        <ul className="mt-3 space-y-1.5">
          {mission.objectives.map((o) => (
            <li key={o} className="flex items-start gap-2 text-sm font-semibold text-ink-500">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lav-400" /> {o}
            </li>
          ))}
        </ul>
        {mission.stdin && (
          <p className="mt-3 rounded-xl bg-cream-100 px-3 py-2 font-mono text-xs text-ink-500">
            Sample input: <span className="text-lav-500">{mission.stdin.trim()}</span>
          </p>
        )}
        {hintIdx < mission.hints.length && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-sun-300/40 bg-sun-50 px-3 py-2.5">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sun-400" />
            <p className="text-sm font-semibold text-ink-600"><span className="font-extrabold text-sun-500">Hint {hintIdx + 1}: </span>{mission.hints[hintIdx]}</p>
            {hintIdx < mission.hints.length - 1 && (
              <button onClick={() => setHintIdx((i) => i + 1)} className="ml-auto shrink-0 text-xs font-extrabold text-sun-500 hover:underline">Next hint</button>
            )}
          </div>
        )}
        {hintIdx === 0 && mission.hints.length > 0 && (
          <button onClick={() => setHintIdx(1)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-sun-500 hover:underline">
            <Lightbulb className="h-3.5 w-3.5" /> Reveal hint 1
          </button>
        )}
      </Card>

      {/* editor */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-cream-300/50 px-4 py-2.5">
          <span className="font-mono text-xs font-bold text-ink-400">Main.java</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCode(mission.starterCode)}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button variant="mint" size="sm" onClick={submit} loading={submitting} disabled={alreadyCompleted}>
              <Send className="h-3.5 w-3.5" /> {alreadyCompleted ? "Completed" : "Submit Solution"}
            </Button>
          </div>
        </div>
        <Editor
          height="380px"
          language="java"
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
        />
      </Card>

      {/* result */}
      {result && (
        <Card className={`p-5 ${result.ok ? "border-mint-300/60 bg-mint-50/60" : "border-sun-300/50 bg-sun-50/50"}`}>
          {result.ok ? (
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-sun-400" />
              <div>
                <p className="text-base font-extrabold text-ink-800">
                  {result.alreadyCompleted ? "Mission already complete!" : `Mission complete — +${result.xpAwarded} XP`}
                </p>
                <p className="text-sm font-semibold text-ink-500">All {result.total} hidden tests passed. {mission.outcome}</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                {result.compileError ? <XCircle className="h-5 w-5 text-red-400" /> : <XCircle className="h-5 w-5 text-sun-400" />}
                <p className="text-sm font-extrabold text-ink-700">
                  {result.compileError ? "Compilation failed" : result.failedTest ? `Test ${result.failedTest} of ${result.total} failed` : "Not quite there yet"}
                  {typeof result.passed === "number" && !result.compileError && (
                    <span className="ml-2 text-ink-400">({result.passed}/{result.total} passed)</span>
                  )}
                </p>
              </div>
              {(result.compileError || result.runtimeError || result.stdout) && (
                <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-ink-900/90 p-3 font-mono text-xs leading-5 text-mint-200">
                  {result.compileError ?? result.runtimeError ?? result.stdout}
                </pre>
              )}
              <p className="mt-2 text-xs font-semibold text-ink-400">Check the failing test&rsquo;s expected output, adjust your logic, and submit again.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
