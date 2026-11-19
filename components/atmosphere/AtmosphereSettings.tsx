"use client";

import { motion } from "framer-motion";
import { Sparkles, Gauge, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAtmosphere } from "./AtmosphereProvider";
import { DEFAULT_PREFS, type AtmosphereMode } from "@/lib/atmosphere/types";
import { cn } from "@/lib/utils";

const MODES: { id: AtmosphereMode; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Follows each page" },
  { id: "matrix", label: "Matrix", hint: "Code rain focus" },
  { id: "neural", label: "Neural", hint: "Particle network" },
  { id: "aurora", label: "Aurora", hint: "Ambient light" },
  { id: "minimal", label: "Minimal", hint: "Nearly still" },
];

function Toggle({
  label, hint, checked, onChange, disabled,
}: {
  label: string; hint?: string; checked: boolean;
  onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
        checked
          ? "border-lav-300/50 bg-lav-100/50"
          : "border-cream-300/50 bg-cream-100/60 hover:border-cream-300",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-ink-700">{label}</span>
        {hint && <span className="block truncate text-xs font-semibold text-ink-400">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-lav-400" : "bg-cream-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

function Slider({
  label, value, onChange, disabled,
}: {
  label: string; value: number;
  onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <label className={cn("block", disabled && "opacity-50 pointer-events-none")}>
      <span className="mb-1.5 flex items-center justify-between text-sm font-extrabold text-ink-700">
        {label}
        <span className="text-xs font-bold text-lav-400">{value}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="atmo-slider w-full"
        aria-label={label}
      />
    </label>
  );
}

/** Atmosphere preferences — saved locally, applied instantly. */
export function AtmosphereSettings() {
  const { prefs, updatePrefs, examMode } = useAtmosphere();
  const disabled = !prefs.effects || prefs.mode === "minimal" || examMode;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink-800">
            <Sparkles className="h-5 w-5 text-lav-400" /> Atmosphere
          </h2>
          <button
            type="button"
            onClick={() => updatePrefs(DEFAULT_PREFS)}
            className="inline-flex items-center gap-1.5 rounded-full border border-cream-300/60 px-3 py-1.5 text-xs font-extrabold text-ink-400 transition-colors hover:border-lav-300/60 hover:text-lav-400"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
        <p className="mt-1 text-sm font-semibold text-ink-400">
          Tune the ambient visual atmosphere. Saved on this device — never affects exams.
        </p>

        {/* Preset modes */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-ink-400">Preset</p>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => updatePrefs({ mode: m.id })}
                title={m.hint}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-extrabold transition-all",
                  prefs.mode === m.id
                    ? "border-lav-400 bg-lav-400 text-white shadow-[0_4px_14px_-4px_rgba(168,85,247,0.6)]"
                    : "border-cream-300/60 bg-cream-100/70 text-ink-500 hover:border-lav-300/60 hover:text-lav-400"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Background effects"
            hint="Master switch for all layers"
            checked={prefs.effects}
            onChange={(v) => updatePrefs({ effects: v })}
          />
          <Toggle
            label="Cursor lighting"
            hint="Soft glow that follows the mouse"
            checked={prefs.cursorLight}
            onChange={(v) => updatePrefs({ cursorLight: v })}
            disabled={!prefs.effects}
          />
          <Toggle
            label="Holographic effects"
            hint="Floating Java snippets"
            checked={prefs.holograms}
            onChange={(v) => updatePrefs({ holograms: v })}
            disabled={!prefs.effects}
          />
          <Toggle
            label="Reduced motion"
            hint="Calms all animation"
            checked={prefs.reducedMotion}
            onChange={(v) => updatePrefs({ reducedMotion: v })}
          />
          <Toggle
            label="Sound effects"
            hint="Coming soon"
            checked={false}
            onChange={() => {}}
            disabled
          />
        </div>

        {/* Intensity sliders */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Slider
            label="Matrix intensity"
            value={prefs.matrixIntensity}
            onChange={(v) => updatePrefs({ matrixIntensity: v })}
            disabled={disabled}
          />
          <Slider
            label="Particle intensity"
            value={prefs.particleIntensity}
            onChange={(v) => updatePrefs({ particleIntensity: v })}
            disabled={disabled}
          />
          <Slider
            label="Aurora intensity"
            value={prefs.auroraIntensity}
            onChange={(v) => updatePrefs({ auroraIntensity: v })}
            disabled={disabled || !prefs.effects}
          />
        </div>

        {examMode && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl border border-sun-300/40 bg-sun-100/50 px-4 py-3 text-xs font-bold text-ink-500">
            <Gauge className="h-4 w-4 text-sun-400" />
            Exam focus mode is active — the atmosphere stays calm automatically.
          </p>
        )}
      </Card>
    </motion.section>
  );
}
