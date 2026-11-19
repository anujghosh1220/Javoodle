/**
 * Javoodle Atmosphere — shared visual engine types.
 * One canvas, one rAF loop, layered effects driven by a single config.
 */

export type AtmosphereMode =
  | "auto"
  | "matrix"
  | "neural"
  | "aurora"
  | "minimal";

export interface AtmospherePrefs {
  /** "auto" follows the per-route preset; others force a look everywhere. */
  mode: AtmosphereMode;
  /** Master switch for all background effects. */
  effects: boolean;
  /** 0–100 */
  matrixIntensity: number;
  /** 0–100 */
  particleIntensity: number;
  /** 0–100 */
  auroraIntensity: number;
  cursorLight: boolean;
  holograms: boolean;
  /** User-requested reduced motion (in addition to OS preference). */
  reducedMotion: boolean;
  /** Reserved for future sound feedback — always off by default. */
  sound: boolean;
}

export const DEFAULT_PREFS: AtmospherePrefs = {
  mode: "auto",
  effects: true,
  matrixIntensity: 55,
  particleIntensity: 60,
  auroraIntensity: 60,
  cursorLight: true,
  holograms: true,
  reducedMotion: false,
  sound: false,
};

/** Resolved, render-ready configuration for the current route + prefs. */
export interface AtmosphereConfig {
  /** Matrix code rain intensity 0–1. */
  rain: number;
  /** Neural particle field intensity 0–1. */
  particles: number;
  /** Orbital knowledge particles 0–1. */
  orbitals: number;
  /** Aurora blobs 0–1 (drives DOM layer opacity). */
  aurora: number;
  /** Cyber grid opacity 0–1 (DOM layer). */
  grid: number;
  /** Floating hologram snippets on/off. */
  holograms: boolean;
  /** Cursor-following light on/off. */
  cursorLight: boolean;
  /** Focus/exam calm — disables cursor FX and holograms. */
  calm: boolean;
  /** Particle accent palette key. */
  accent: "purple" | "cyan" | "emerald" | "mixed";
  /** Everything off — engine idles. */
  off: boolean;
}
