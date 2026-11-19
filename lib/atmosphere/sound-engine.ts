/**
 * Javoodle Sound Engine — Web Audio API synthesized UI sounds.
 * No audio files, no dependencies. Lazy AudioContext (created only after a
 * user gesture), single context, throttled/deduped, exam + hidden-tab mute.
 */

export type SoundName =
  | "ui" | "nav" | "correct" | "incorrect" | "xp" | "levelup"
  | "achievement" | "mission" | "streak" | "exec_ok" | "exec_fail" | "lesson";

let ctx: AudioContext | null = null;
let lastPlay = 0;
let enabled = true;
let muted = false; // exam route / hidden tab

export function setSoundEnabled(on: boolean) { enabled = on; }
export function setSoundMuted(m: boolean) { muted = m; }
function getAudioContextConstructor(): (new () => AudioContext) | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & { webkitAudioContext?: new () => AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function soundSupported(): boolean {
  return getAudioContextConstructor() !== null;
}

/** Call from a user-gesture handler to unlock audio. */
export function unlockAudio() {
  if (!soundSupported()) return;
  try {
    if (!ctx) {
      const AC = getAudioContextConstructor();
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch { /* unsupported */ }
}

interface Tone { f: number; t?: number; d?: number; type?: OscillatorType; g?: number }

const SOUNDS: Record<SoundName, Tone[]> = {
  ui:         [{ f: 660, d: 0.05, g: 0.05 }],
  nav:        [{ f: 520, d: 0.07, g: 0.04 }],
  correct:    [{ f: 523, d: 0.09, g: 0.06 }, { f: 784, t: 0.08, d: 0.12, g: 0.06 }],
  incorrect:  [{ f: 220, d: 0.18, g: 0.05, type: "sine" }],
  xp:         [{ f: 880, d: 0.06, g: 0.05 }, { f: 1175, t: 0.05, d: 0.09, g: 0.05 }],
  levelup:    [{ f: 523, d: 0.12 }, { f: 659, t: 0.1, d: 0.12 }, { f: 784, t: 0.2, d: 0.12 }, { f: 1047, t: 0.3, d: 0.25, g: 0.07 }],
  achievement:[{ f: 659, d: 0.1 }, { f: 988, t: 0.09, d: 0.16, g: 0.06 }],
  mission:    [{ f: 523, d: 0.1 }, { f: 659, t: 0.09, d: 0.1 }, { f: 784, t: 0.18, d: 0.18, g: 0.06 }],
  streak:     [{ f: 440, d: 0.1 }, { f: 554, t: 0.09, d: 0.14, g: 0.05 }],
  exec_ok:    [{ f: 740, d: 0.07, g: 0.045 }],
  exec_fail:  [{ f: 196, d: 0.15, g: 0.045, type: "sine" }],
  lesson:     [{ f: 587, d: 0.1 }, { f: 880, t: 0.1, d: 0.16, g: 0.055 }],
};

const PRIORITY: Partial<Record<SoundName, number>> = {
  levelup: 100, achievement: 90, mission: 80, lesson: 70, streak: 60,
  xp: 50, correct: 40, exec_ok: 30, exec_fail: 30, incorrect: 30, nav: 20, ui: 10,
};

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pending: { name: SoundName; at: number } | null = null;

function tone(t: Tone) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const now = ctx.currentTime + (t.t ?? 0);
  o.type = t.type ?? "sine";
  o.frequency.value = t.f;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(t.g ?? 0.05, now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, now + (t.d ?? 0.1));
  o.connect(g).connect(ctx.destination);
  o.start(now);
  o.stop(now + (t.d ?? 0.1) + 0.05);
}

function playNow(name: SoundName) {
  if (!ctx || ctx.state !== "running") return;
  for (const t of SOUNDS[name]) tone(t);
}

/**
 * Play a sound with dedupe: within a 400ms window only the highest-priority
 * pending sound survives (level-up beats XP beats UI click, etc.).
 */
export function playSound(name: SoundName) {
  if (!enabled || muted || !soundSupported()) return;
  unlockAudio();
  if (!ctx || ctx.state !== "running") return;
  const now = Date.now();
  if (now - lastPlay < 90) return; // spam guard
  lastPlay = now;

  if (pendingTimer) {
    const cur = PRIORITY[pending?.name ?? "ui"] ?? 0;
    const next = PRIORITY[name] ?? 0;
    if (next <= cur) return; // existing pending sound is more important
    clearTimeout(pendingTimer);
  }
  pending = { name, at: now };
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    const p = pending; pending = null;
    if (p) playNow(p.name);
  }, 60);
}
