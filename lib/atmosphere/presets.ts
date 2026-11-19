import { DEFAULT_PREFS, type AtmosphereConfig, type AtmospherePrefs } from "./types";

const EXAM_TAKE = /^\/exams\/[^/]+\/take/;
const ADMIN = /^\/admin/;

function base(pathname: string): Omit<AtmosphereConfig, "off" | "calm"> {
  if (EXAM_TAKE.test(pathname)) {
    // Focus mode — nearly invisible, calm background.
    return {
      rain: 0.04, particles: 0.05, orbitals: 0, aurora: 0.12, grid: 0,
      holograms: false, cursorLight: false, accent: "purple",
    };
  }
  if (ADMIN.test(pathname)) {
    // Restrained academy-admin atmosphere.
    return {
      rain: 0.16, particles: 0.32, orbitals: 0.15, aurora: 0.4, grid: 0.06,
      holograms: false, cursorLight: true, accent: "purple",
    };
  }
  if (pathname === "/") {
    // Public landing — richest experience.
    return {
      rain: 0.5, particles: 0.85, orbitals: 0.6, aurora: 0.85, grid: 0.12,
      holograms: true, cursorLight: true, accent: "mixed",
    };
  }
  if (pathname === "/dashboard") {
    // Neural Academy command centre.
    return {
      rain: 0.35, particles: 0.9, orbitals: 0.5, aurora: 0.75, grid: 0.05,
      holograms: true, cursorLight: true, accent: "purple",
    };
  }
  if (/^\/coding/.test(pathname)) {
    // Developer environment — grid-forward, green/cyan.
    return {
      rain: 0.3, particles: 0.45, orbitals: 0.2, aurora: 0.45, grid: 0.3,
      holograms: false, cursorLight: true, accent: "cyan",
    };
  }
  if (/^\/playground/.test(pathname)) {
    // Experimental lab.
    return {
      rain: 0.35, particles: 0.55, orbitals: 0.35, aurora: 0.55, grid: 0.25,
      holograms: true, cursorLight: true, accent: "cyan",
    };
  }
  if (/^\/learn/.test(pathname)) {
    // Knowledge universe — readable, violet-leaning.
    return {
      rain: 0.22, particles: 0.55, orbitals: 0.4, aurora: 0.7, grid: 0.04,
      holograms: true, cursorLight: true, accent: "purple",
    };
  }
  if (/^\/missions/.test(pathname)) {
    // Mission arena — cyan/green challenge energy.
    return {
      rain: 0.3, particles: 0.65, orbitals: 0.4, aurora: 0.6, grid: 0.12,
      holograms: false, cursorLight: true, accent: "cyan",
    };
  }
  if (/^\/visualizer/.test(pathname)) {
    // Visualizer — cyan/violet, grid-forward like a lab bench.
    return {
      rain: 0.15, particles: 0.5, orbitals: 0.3, aurora: 0.5, grid: 0.28,
      holograms: false, cursorLight: true, accent: "cyan",
    };
  }
  if (/^\/projects/.test(pathname)) {
    // Project universe — emerald/purple workshop.
    return {
      rain: 0.25, particles: 0.7, orbitals: 0.5, aurora: 0.65, grid: 0.1,
      holograms: true, cursorLight: true, accent: "emerald",
    };
  }
  if (/^\/practice/.test(pathname) || /^\/exams/.test(pathname)) {
    // Training arena / exam list — focused but alive.
    return {
      rain: 0.25, particles: 0.6, orbitals: 0.3, aurora: 0.55, grid: 0.05,
      holograms: false, cursorLight: true, accent: "mixed",
    };
  }
  if (/^\/growth/.test(pathname)) {
    // Progress observatory — data-like particle drift.
    return {
      rain: 0.18, particles: 0.8, orbitals: 0.55, aurora: 0.6, grid: 0.08,
      holograms: false, cursorLight: true, accent: "emerald",
    };
  }
  // Generic student fallback.
  return {
    rain: 0.3, particles: 0.6, orbitals: 0.35, aurora: 0.6, grid: 0.08,
    holograms: true, cursorLight: true, accent: "purple",
  };
}

/** Force-look presets applied when the user picks a non-auto mode. */
function forcedMode(mode: AtmospherePrefs["mode"]): Partial<AtmosphereConfig> | null {
  switch (mode) {
    case "matrix":
      return { rain: 0.85, particles: 0.25, orbitals: 0, aurora: 0.35, grid: 0.1, holograms: false, accent: "purple" };
    case "neural":
      return { rain: 0.12, particles: 0.95, orbitals: 0.6, aurora: 0.55, grid: 0.05, holograms: false, accent: "purple" };
    case "aurora":
      return { rain: 0.05, particles: 0.3, orbitals: 0.2, aurora: 1, grid: 0, holograms: false, accent: "cyan" };
    case "minimal":
      return { rain: 0, particles: 0, orbitals: 0, aurora: 0.15, grid: 0, holograms: false, cursorLight: false, accent: "purple" };
    default:
      return null;
  }
}

export function resolveConfig(
  pathname: string,
  prefs: AtmospherePrefs,
  osReducedMotion: boolean
): AtmosphereConfig {
  const calm = EXAM_TAKE.test(pathname);
  const forced = prefs.mode === "auto" ? null : forcedMode(prefs.mode);
  const b = forced ?? base(pathname);

  // Exam focus always wins over user modes — integrity first.
  const cfg: AtmosphereConfig = calm
    ? { ...base(pathname), calm: true, off: false }
    : {
        rain: b.rain ?? 0,
        particles: b.particles ?? 0,
        orbitals: b.orbitals ?? 0,
        aurora: b.aurora ?? 0,
        grid: b.grid ?? 0,
        holograms: b.holograms ?? false,
        cursorLight: b.cursorLight ?? false,
        calm: false,
        accent: b.accent ?? "purple",
        off: false,
      };

  // Forced modes never apply during exam focus — integrity first.
  if (forced && !calm) {
    cfg.calm = false;
    cfg.holograms = b.holograms ?? false;
    cfg.cursorLight = b.cursorLight ?? cfg.cursorLight;
    if (prefs.mode === "minimal") cfg.cursorLight = false;
  }

  // User intensity sliders scale the canvas layers.
  const mi = prefs.matrixIntensity / 100;
  const pi = prefs.particleIntensity / 100;
  cfg.rain *= mi;
  cfg.particles *= pi;
  cfg.orbitals *= pi;

  // Global effects switch / minimal prefs.
  if (!prefs.effects || prefs.reducedMotion || osReducedMotion || prefs.mode === "minimal") {
    cfg.off = true;
    cfg.calm = true;
    cfg.holograms = false;
    cfg.cursorLight = false;
    cfg.grid = 0;
    cfg.aurora = prefs.mode === "minimal" ? 0.12 : 0;
  }

  return cfg;
}

function sanitize(raw: unknown): AtmospherePrefs {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  const num = (v: unknown, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : d;
  const mode = typeof o.mode === "string" && ["auto", "matrix", "neural", "aurora", "minimal"].includes(o.mode)
    ? (o.mode as AtmospherePrefs["mode"])
    : DEFAULT_PREFS.mode;
  return {
    mode,
    effects: bool(o.effects, DEFAULT_PREFS.effects),
    matrixIntensity: num(o.matrixIntensity, DEFAULT_PREFS.matrixIntensity),
    particleIntensity: num(o.particleIntensity, DEFAULT_PREFS.particleIntensity),
    auroraIntensity: num(o.auroraIntensity, DEFAULT_PREFS.auroraIntensity),
    cursorLight: bool(o.cursorLight, DEFAULT_PREFS.cursorLight),
    holograms: bool(o.holograms, DEFAULT_PREFS.holograms),
    reducedMotion: bool(o.reducedMotion, DEFAULT_PREFS.reducedMotion),
    // Sound is always-on (no user toggle); stored sound prefs are ignored.
    sound: true,
  };
}

const LEGACY_PREFS_KEY = "javoodle.atmosphere.v1";

export function loadPrefs(): AtmospherePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return sanitize(JSON.parse(raw));
    // v1 → v2 migration: the old panel exposed per-effect controls. The new
    // product direction is a single balanced default, so visual prefs reset
    // to DEFAULT_PREFS. Sound was forced off in v1 (no real choice existed),
    // so the new default applies; an explicit v2 sound choice is preserved.
    const legacy = localStorage.getItem(LEGACY_PREFS_KEY);
    if (legacy) {
      // v1 sound was forced false (no real choice existed) → new defaults apply.
      return { ...DEFAULT_PREFS };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFS;
}

export function savePrefs(prefs: AtmospherePrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export const PREFS_KEY = "javoodle.atmosphere.v2";
