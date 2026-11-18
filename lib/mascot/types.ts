export type RobotMood =
  | "idle"
  | "happy"
  | "excited"
  | "thinking"
  | "confused"
  | "sad"
  | "sleepy"
  | "focused"
  | "celebrating";

/** High-level animation states driven by the movement controller. */
export type AnimState =
  | "idle"
  | "walk"
  | "run"
  | "turn"
  | "wave"
  | "look"
  | "sit"
  | "sleep"
  | "wake"
  | "jump"
  | "celebrate"
  | "dance"
  | "curious"
  | "think"
  | "interact";

/** A point of interest the robot may approach (UI element anchor). */
export interface InterestPoint {
  x: number;
  y: number;
  label?: string;
}

/**
 * Per-frame pose written directly to the DOM by the companion.
 * Angles are SVG degrees; x/y are CSS pixels (x = center, y = ground/feet).
 */
export interface PoseFrame {
  x: number;
  y: number;
  facing: 1 | -1;
  /** scaleX multiplier used for the turn squash (1 = normal). */
  sx: number;
  /** whole-character vertical offset in SVG units (negative = up). */
  rootY: number;
  /** forward lean in degrees, pivoting at the feet. */
  rootRot: number;
  /** torso/leg group drop in SVG units (sitting). */
  bodyY: number;
  /** breathing squash on the root group (1 = neutral). */
  breath: number;
  legL: number;
  legR: number;
  /** vertical foot lift in SVG units while walking (negative = up) */
  legLiftL: number;
  legLiftR: number;
  armL: number;
  armR: number;
  headRot: number;
  headDX: number;
  headDY: number;
  pupilX: number;
  pupilY: number;
  /** sleep "Zzz" opacity 0..1 */
  zzz: number;
}
