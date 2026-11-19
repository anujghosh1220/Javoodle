"use client";

import { useMemo, useRef, useState } from "react";
import { VIZ_EXAMPLES, clampStep, type VizExample } from "@/lib/visualizer/engine";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal, RevealItem } from "@/components/ui/Reveal";
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Eye } from "lucide-react";

const KIND_LABEL: Record<VizExample["kind"], string> = {
  variables: "Variables", array: "Arrays", loop: "Loops", bubble: "Sorting", selection: "Sorting", string: "Strings",
};

export function Visualizer() {
  const [exId, setExId] = useState(VIZ_EXAMPLES[0].id);
  const ex = useMemo(() => VIZ_EXAMPLES.find((e) => e.id === exId) ?? VIZ_EXAMPLES[0], [exId]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const s = ex.steps[clampStep(step, ex.steps)];

  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; setPlaying(false); };
  const tick = () => setStep((i) => {
    const next = clampStep(i + 1, ex.steps);
    if (next === ex.steps.length - 1 && ex.steps[next].done) stop();
    return next;
  });

  const play = () => {
    stop();
    setPlaying(true);
    timer.current = setInterval(tick, 1400 / speed);
  };
  const pause = () => { stop(); };
  const reset = () => { stop(); setStep(0); };

  // cleanup on unmount/example change
  const pick = (id: string) => { stop(); setExId(id); setStep(0); };

  return (
    <Reveal className="mx-auto w-full max-w-5xl gap-6 py-8">
      <RevealItem>
        <PageHeader title="Java Visualizer" description="Step through curated Java programs and watch memory, arrays and loops change — one deterministic beat at a time." />
      </RevealItem>

      <RevealItem className="flex flex-wrap gap-2">
        {VIZ_EXAMPLES.map((e) => (
          <button key={e.id} onClick={() => pick(e.id)}
            className={`rounded-full border px-4 py-2 text-sm font-extrabold transition-all ${e.id === exId ? "border-lav-400 bg-lav-400 text-white" : "border-cream-300/60 bg-cream-100/70 text-ink-500 hover:border-lav-300/60 hover:text-lav-400"}`}>
            {KIND_LABEL[e.kind]} · {e.title}
          </button>
        ))}
      </RevealItem>

      <RevealItem className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* code + explanation */}
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <div className="border-b border-cream-300/50 px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest text-ink-400">{ex.title}</div>
            <pre className="overflow-x-auto bg-[#0a1120] p-4 font-mono text-[13px] leading-7">
              {ex.source.map((line, i) => {
                const ln = i + 1;
                const active = ln === s.line;
                return (
                  <div key={ln} className={`flex gap-3 rounded px-2 ${active ? "bg-lav-400/15 text-white" : "text-ink-400"}`}>
                    <span className="w-5 shrink-0 select-none text-right text-ink-400/60">{ln}</span>
                    <span>{line || " "}</span>
                  </div>
                );
              })}
            </pre>
          </Card>

          <Card className="flex min-h-28 flex-col justify-center p-5">
            <p className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-ink-600">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-lav-400" /> {s.explanation}
            </p>
            {s.done && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-extrabold text-mint-500"><Check2 /> Program finished.</p>
            )}
          </Card>
        </div>

        {/* state panels */}
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-ink-400">Variables</h3>
            {s.vars.length === 0 ? <p className="text-sm font-semibold text-ink-400">—</p> : (
              <div className="flex flex-wrap gap-2">
                {s.vars.map((varr) => (
                  <div key={varr.name} className="rounded-xl border border-cream-300/50 bg-cream-100/70 px-3 py-2 text-center">
                    <p className="font-mono text-[10px] font-bold uppercase text-ink-400">{varr.name} : {varr.type}</p>
                    <p className="font-mono text-sm font-extrabold text-lav-300">{varr.value}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {s.cells && (
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-ink-400">Array / memory</h3>
              <div className="flex flex-wrap gap-1.5">
                {s.cells.map((c) => (
                  <div key={c.index} className={`flex h-12 w-12 flex-col items-center justify-center rounded-lg border font-mono text-xs font-extrabold transition-colors ${
                    c.state === "compare" ? "border-sun-300 bg-sun-100 text-sun-500"
                    : c.state === "swap" ? "border-red-400/60 bg-red-500/10 text-red-400"
                    : c.state === "sorted" ? "border-mint-300 bg-mint-100 text-mint-600"
                    : c.state === "min" ? "border-cyan-300 bg-cyan-400/10 text-cyan-300"
                    : "border-cream-300/60 bg-cream-100/60 text-ink-500"
                  }`}>
                    <span className="text-[9px] font-bold opacity-60">[{c.index}]</span>
                    <span>{typeof c.value === "number" && c.value > 128 ? String.fromCharCode(c.value) : c.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-ink-400">Output</h3>
            <pre className="min-h-10 rounded-xl bg-ink-900/90 p-3 font-mono text-xs text-mint-200">{s.output || "(nothing yet)"}</pre>
          </Card>
        </div>
      </RevealItem>

      {/* controls */}
      <RevealItem>
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <Button variant="secondary" size="sm" onClick={() => setStep((i) => clampStep(i - 1, ex.steps))} disabled={step === 0}><ChevronLeft className="h-4 w-4" /> Prev</Button>
          {playing ? (
            <Button variant="sun" size="sm" onClick={pause}><Pause className="h-4 w-4" /> Pause</Button>
          ) : (
            <Button variant="mint" size="sm" onClick={play} disabled={step >= ex.steps.length - 1}><Play className="h-4 w-4" /> Play</Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setStep((i) => clampStep(i + 1, ex.steps))} disabled={step >= ex.steps.length - 1}>Next <ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-4 w-4" /> Restart</Button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-bold text-ink-400">Speed</span>
            {[0.5, 1, 2].map((sp) => (
              <button key={sp} onClick={() => { setSpeed(sp); if (playing) { stop(); setPlaying(true); timer.current = setInterval(tick, 1400 / sp); } }}
                className={`rounded-full px-3 py-1 text-xs font-extrabold ${speed === sp ? "bg-lav-400 text-white" : "bg-cream-100 text-ink-500"}`}>{sp}×</button>
            ))}
          </div>
          <Chip className="bg-cream-100 text-ink-400 border-cream-300/50">Step {step + 1}/{ex.steps.length}</Chip>
        </Card>
      </RevealItem>
    </Reveal>
  );
}

function Check2() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>;
}
