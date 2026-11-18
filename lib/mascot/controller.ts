import type { AnimState, InterestPoint, PoseFrame, RobotMood } from "./types";
import type { RobotEmotion } from "./events";

const WALK_SPEED = 46; // px/s
const TURN_TIME = 0.32;

const SPEED_BY_MOOD: Record<RobotMood, number> = {
  idle: 1,
  happy: 1.15,
  excited: 1.5,
  thinking: 0.55,
  confused: 0.8,
  sad: 0.7,
  sleepy: 0.45,
  focused: 0.4,
  celebrating: 1.6,
};

interface WeightedBehavior {
  state: AnimState;
  weight: number;
  min: number;
  max: number;
}

/** Ambient behaviours the robot picks when it has nothing else to do. */
const BEHAVIORS: WeightedBehavior[] = [
  { state: "walk", weight: 34, min: 0, max: 0 }, // duration = travel time
  { state: "look", weight: 14, min: 2.2, max: 4.5 },
  { state: "wave", weight: 8, min: 1.6, max: 2.6 },
  { state: "sit", weight: 10, min: 4, max: 8 },
  { state: "think", weight: 6, min: 2.5, max: 5 },
  { state: "curious", weight: 12, min: 0, max: 0 }, // travel time
  { state: "dance", weight: 5, min: 2.5, max: 5 },
  { state: "jump", weight: 5, min: 0.9, max: 1.4 },
  { state: "interact", weight: 6, min: 0, max: 0 }, // travel time (to a point)
];

export interface BrainCallbacks {
  /** CSS-pixel viewport size. */
  viewport: () => { w: number; h: number };
  /** Inflated keep-out rects (buttons, inputs, nav, editor...). */
  obstacles: () => { x: number; y: number; w: number; h: number }[];
  /** Candidate points of interest to visit. */
  interests: () => InterestPoint[];
  /** Called when a named behaviour starts (for speech lines). */
  onBehavior?: (state: AnimState) => void;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Autonomous movement + animation state machine for the Javoodle companion.
 * Pure logic — the companion applies the returned PoseFrame to the DOM.
 */
export class MascotBrain {
  // kinematics (CSS px; x = centre, y = ground/feet line)
  x = 0;
  y = 0;
  facing: 1 | -1 = 1;
  speed = 0;

  state: AnimState = "idle";
  private stateT = 0;
  private phase = 0; // walk-cycle phase
  private dwell = 0; // idle time before next behaviour
  private target: { x: number; y: number } | null = null;
  private moveSpeed = WALK_SPEED;
  private turnFrom: 1 | -1 = 1;
  private turnT = 0;

  // presentation
  mood: RobotMood = "idle";
  private sitAmt = 0;
  private zzzAmt = 0;
  private lookPoint: { x: number; y: number } | null = null;
  private gaze = { x: 0, y: 0, tx: 0, ty: 0 };
  private pointer = { x: 0, y: 0, at: 0 };
  private cursorCooldown = 0;
  private headScanT = 0;
  private headScan = 0;

  paused = false;
  restricted = false; // e.g. active exam — park and stay out of the way
  distracted = false; // text selection / form interaction in progress
  private parked = false;
  private escaping = false; // inside an obstacle — ghost out ignoring collisions

  private raf = 0;
  private last = 0;
  private apply: ((p: PoseFrame) => void) | null = null;
  private obsCache: { x: number; y: number; w: number; h: number }[] = [];
  private obsTimer = 0;
  private readonly cb: BrainCallbacks;
  /** footprint used for collision (CSS px) */
  private hw = 44; // half width
  private hh = 140; // height above feet

  constructor(cb: BrainCallbacks) {
    this.cb = cb;
  }

  // ------------------------------------------------------------------ API

  start(apply: (p: PoseFrame) => void) {
    if (this.raf) return;
    this.apply = apply;
    const { w, h } = this.cb.viewport();
    if (this.x === 0 && this.y === 0) {
      this.x = w * 0.72;
      this.y = h - 90;
      this.facing = -1;
    }
    this.clampIntoBounds();
    this.obsCache = this.cb.obstacles();
    if (this.collides(this.x, this.y)) {
      const free = this.freeSpotNear(this.x, this.y);
      if (free) { this.x = free.x; this.y = free.y; }
    }
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!document.hidden) this.update(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.apply = null;
  }

  /** Update collision footprint (called when the rendered size changes). */
  setFootprint(halfWidth: number, height: number) {
    this.hw = halfWidth;
    this.hh = height;
  }

  setMood(m: RobotMood) {
    if (this.mood === m) return;
    this.mood = m;
    if (m === "celebrating" && this.state !== "celebrate" && !this.paused && !this.restricted) {
      this.enter("celebrate", rand(2.2, 3.4));
    } else if (m === "excited" && this.state === "idle" && Math.random() < 0.5) {
      this.enter("jump", rand(0.9, 1.3));
    } else if (m === "sleepy") {
      this.zTarget(1);
    } else {
      this.zTarget(0);
    }
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      this.state = "idle";
      this.target = null;
      this.lookPoint = null;
      this.dwell = 0;
    }
  }

  setRestricted(r: boolean) {
    if (this.restricted === r) return;
    this.restricted = r;
    if (r) {
      this.target = null;
      this.lookPoint = null;
      this.parked = false;
      this.state = "idle";
      this.dwell = 0.8; // brief beat, then walk to a parking spot
    } else {
      this.dwell = rand(0.6, 1.6);
    }
  }

  setDistracted(d: boolean) {
    this.distracted = d;
    if (d) {
      this.target = null;
      this.state = "idle";
    }
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.at = performance.now();
  }

  /** User poked the robot — celebrate briefly. */
  poke() {
    if (this.paused) return;
    this.cursorCooldown = Math.max(this.cursorCooldown, 8);
    const pick = Math.random();
    this.enter(pick < 0.4 ? "wave" : pick < 0.7 ? "jump" : "dance", rand(1.4, 2.6));
  }

  react(emotion: RobotEmotion) {
    if (this.paused || this.restricted) return;
    const map: Partial<Record<RobotEmotion, AnimState>> = {
      celebrating: "celebrate",
      excited: "jump",
      thinking: "think",
      confused: "look",
      encouraging: "idle",
      focused: "idle",
      sleepy: "sit",
      happy: "wave",
      idle: "idle",
    };
    const s = map[emotion];
    if (!s || s === "idle") return;
    this.enter(s, rand(2, 3.6));
  }

  // ------------------------------------------------------------- internals

  private zTarget(v: number) {
    // zzz amount eases toward v in update via zzzAmt
    this.zzzGoal = v;
  }
  private zzzGoal = 0;

  private enter(state: AnimState, duration: number) {
    this.state = state;
    this.stateT = 0;
    this.target = null;
    this.lookPoint = null;
    // duration encoded via dwell-like timer: reuse stateT vs a per-state limit
    this.stateLimit = duration;
    this.cb.onBehavior?.(state);
  }
  private stateLimit = Infinity;

  private travelTo(target: { x: number; y: number }, speed: number, then?: AnimState) {
    this.target = target;
    this.moveSpeed = speed * SPEED_BY_MOOD[this.mood];
    this.then = then ?? null;
    const wantFacing: 1 | -1 = target.x >= this.x ? 1 : -1;
    if (wantFacing !== this.facing) {
      this.turnFrom = this.facing;
      this.facing = wantFacing;
      this.turnT = TURN_TIME;
      this.state = "turn";
      this.stateT = 0;
    } else {
      this.state = speed > WALK_SPEED * 1.3 ? "run" : "walk";
      this.stateT = 0;
    }
  }
  private then: AnimState | null = null;

  private pickBehavior() {
    if (this.restricted) {
      if (!this.parked) {
        const spot = this.parkingSpot();
        this.travelTo(spot, WALK_SPEED * 0.8, "sit");
        this.parked = true;
      }
      return;
    }
    if (this.distracted || this.paused) return;

    // occasional cursor approach takes priority over ambient behaviour
    if (this.tryCursorApproach()) return;

    const interests = this.cb.interests();
    const total = BEHAVIORS.reduce((s, b) => s + b.weight, 0);
    let roll = Math.random() * total;
    let chosen = BEHAVIORS[0];
    for (const b of BEHAVIORS) {
      roll -= b.weight;
      if (roll <= 0) { chosen = b; break; }
    }

    // mood biases
    if (this.mood === "sleepy" && chosen.state !== "sit" && Math.random() < 0.6) chosen = BEHAVIORS[3];
    if (this.mood === "focused" && chosen.state === "dance") chosen = BEHAVIORS[3];
    if ((this.mood === "excited" || this.mood === "celebrating") && Math.random() < 0.4) chosen = BEHAVIORS.find(b => b.state === "jump")!;

    switch (chosen.state) {
      case "walk": {
        const t = this.randomTarget();
        if (t) this.travelTo(t, WALK_SPEED);
        else this.dwell = rand(1, 2.5);
        break;
      }
      case "curious": {
        if (interests.length && Math.random() < 0.8) {
          const p = interests[Math.floor(Math.random() * interests.length)];
          const spot = this.spotsNearPoint(p.x, p.y).find((c) => !this.collides(c.x, c.y));
          if (spot) {
            this.lookPoint = { x: p.x, y: p.y - 10 };
            this.travelTo(spot, WALK_SPEED * 0.9, "curious");
            break;
          }
        }
        const t = this.randomTarget();
        if (t) this.travelTo(t, WALK_SPEED * 0.85);
        else this.dwell = rand(1, 2);
        break;
      }
      case "interact": {
        // amble to a random interest point and look at it
        if (interests.length) {
          const p = interests[Math.floor(Math.random() * interests.length)];
          const spot = this.spotsNearPoint(p.x, p.y).find((c) => !this.collides(c.x, c.y));
          if (spot) {
            this.lookPoint = { x: p.x, y: p.y };
            this.travelTo(spot, WALK_SPEED, "interact");
            break;
          }
        }
        this.dwell = rand(1, 2);
        break;
      }
      default:
        this.enter(chosen.state, rand(chosen.min, chosen.max));
    }
  }

  private tryCursorApproach(): boolean {
    const now = performance.now();
    if (now - this.pointer.at > 2000 || now < this.cursorCooldown) return false;
    const dx = this.pointer.x - this.x;
    const dy = this.pointer.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 170 || dist > 460) return false;
    if (Math.random() > 0.3) return false;
    // stop ~150px short of the cursor
    const ux = dx / dist;
    const uy = dy / dist;
    const { w, h } = this.cb.viewport();
    const spot = {
      x: clamp(this.pointer.x - ux * 150, this.hw + 10, w - this.hw - 10),
      y: clamp(this.pointer.y - uy * 150, this.hh + 10, h - 20),
    };
    if (this.collides(spot.x, spot.y)) return false;
    this.cursorCooldown = now + rand(9000, 16000);
    this.lookPoint = { x: this.pointer.x, y: this.pointer.y };
    this.travelTo(spot, WALK_SPEED * 1.1, "interact");
    return true;
  }

  private parkingSpot(): { x: number; y: number } {
    const { w, h } = this.cb.viewport();
    // prefer bottom-left corner area, out of the way
    const cands = [
      { x: w * 0.12, y: h - 80 },
      { x: w * 0.2, y: h - 60 },
      { x: w * 0.08, y: h - 140 },
      { x: this.x, y: h - 70 },
    ];
    for (const c of cands) {
      const spot = {
        x: clamp(c.x, this.hw + 10, w - this.hw - 10),
        y: clamp(c.y, this.hh + 10, h - 20),
      };
      if (!this.collides(spot.x, spot.y)) return spot;
    }
    return { x: clamp(w * 0.12, this.hw + 10, w - this.hw - 10), y: h - 80 };
  }

  /** Candidate standing spots around a point of interest (below, above, sides). */
  private spotsNearPoint(px: number, py: number): { x: number; y: number }[] {
    const { w, h } = this.cb.viewport();
    const offs = [
      { dx: 0, dy: 64 }, { dx: 0, dy: -84 }, { dx: -84, dy: 24 }, { dx: 84, dy: 24 },
      { dx: -64, dy: 70 }, { dx: 64, dy: 70 }, { dx: -100, dy: -40 }, { dx: 100, dy: -40 },
    ];
    return offs.map((o) => ({
      x: clamp(px + o.dx + rand(-14, 14), this.hw + 10, w - this.hw - 10),
      y: clamp(py + o.dy + rand(-10, 10), this.hh + 10, h - 20),
    }));
  }

  /** Nearest non-colliding point on expanding rings around (x, y). */
  private freeSpotNear(x: number, y: number): { x: number; y: number } | null {
    const { w, h } = this.cb.viewport();
    for (const r of [50, 90, 140, 200, 280, 380]) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + r * 0.7;
        const cx = clamp(x + Math.cos(a) * r, this.hw + 10, w - this.hw - 10);
        const cy = clamp(y + Math.sin(a) * r * 0.7, this.hh + 10, h - 20);
        if (!this.collides(cx, cy)) return { x: cx, y: cy };
      }
    }
    return null;
  }

  private randomTarget(): { x: number; y: number } | null {
    const { w, h } = this.cb.viewport();
    for (let i = 0; i < 14; i++) {
      const x = rand(this.hw + 14, w - this.hw - 14);
      const y = rand(this.hh + 16, h - 26);
      const d = Math.hypot(x - this.x, y - this.y);
      if (d < 90) continue;
      if (this.collides(x, y)) continue;
      return { x, y };
    }
    return null;
  }

  /** Robot AABB vs cached obstacle rects. */
  private collides(x: number, y: number): boolean {
    const l = x - this.hw;
    const r = x + this.hw;
    const t = y - this.hh;
    const b = y;
    for (const o of this.obsCache) {
      if (r > o.x - 6 && l < o.x + o.w + 6 && b > o.y - 6 && t < o.y + o.h + 6) return true;
    }
    return false;
  }

  private clampIntoBounds() {
    const { w, h } = this.cb.viewport();
    this.x = clamp(this.x, this.hw + 8, w - this.hw - 8);
    this.y = clamp(this.y, this.hh + 8, h - 14);
  }

  // --------------------------------------------------------------- update

  private update(dt: number) {
    // refresh obstacle cache ~2x/sec
    this.obsTimer -= dt;
    if (this.obsTimer <= 0) {
      this.obsTimer = 0.5;
      this.obsCache = this.cb.obstacles();
    }
    // if the robot itself is now inside an obstacle (resize/scroll/spawn),
    // ghost out to the nearest free spot
    if (this.collides(this.x, this.y)) {
      if (!this.target) {
        const free = this.freeSpotNear(this.x, this.y) ?? this.randomTarget();
        if (free) {
          this.escaping = true;
          this.travelTo(free, WALK_SPEED * 1.4);
        }
      }
    } else {
      this.escaping = false;
    }

    this.stateT += dt;
    this.cursorCooldown -= dt * 1000;
    this.headScanT -= dt;

    // zzz easing
    this.zzzAmt = lerp(this.zzzAmt, this.zzzGoal, 1 - Math.exp(-dt * 3));

    // gaze: follow pointer unless a lookPoint overrides
    const px = this.pointer.at > 0 ? this.pointer.x : this.x + this.facing * 200;
    const py = this.pointer.at > 0 ? this.pointer.y : this.y - this.hh * 0.6;
    const gx = this.lookPoint ? this.lookPoint.x : px;
    const gy = this.lookPoint ? this.lookPoint.y : py;
    // ~3 svg units of pupil travel at ~250px distance
    this.gaze.tx = clamp((gx - this.x) * 0.012, -3.2, 3.2);
    this.gaze.ty = clamp((gy - (this.y - this.hh * 0.55)) * 0.009, -2.6, 2.6);
    const k = 1 - Math.exp(-dt * 7);
    this.gaze.x = lerp(this.gaze.x, this.gaze.tx, k);
    this.gaze.y = lerp(this.gaze.y, this.gaze.ty, k);

    // head scanning while idle
    if (this.state === "idle" && !this.lookPoint) {
      if (this.headScanT <= 0) {
        this.headScanT = rand(2.5, 6);
        this.headScan = rand(-1, 1) * 6;
      }
    }

    // state machine
    switch (this.state) {
      case "turn":
        this.turnT -= dt;
        if (this.turnT <= 0 && this.target) {
          this.state = this.moveSpeed > WALK_SPEED * 1.3 ? "run" : "walk";
          this.stateT = 0;
        } else if (this.turnT <= 0) {
          this.state = "idle";
        }
        break;

      case "walk":
      case "run": {
        if (!this.target) { this.state = "idle"; this.dwell = rand(0.8, 2); break; }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        const step = this.moveSpeed * dt;
        if (dist <= Math.max(step, 6)) {
          this.x = this.target.x;
          this.y = this.target.y;
          this.target = null;
          this.speed = 0;
          const arrive = this.then ?? "idle";
          this.then = null;
          if (arrive === "look") {
            this.enter("look", rand(2, 4));
          } else if (arrive === "sit") {
            this.enter("sit", rand(5, 9));
          } else if (arrive === "curious") {
            this.enter("curious", rand(3, 5.5));
          } else if (arrive === "interact") {
            this.enter("interact", rand(3.5, 5.5));
          } else {
            this.state = "idle";
            this.dwell = rand(0.7, 2.4);
          }
          break;
        }
        // axis-separated move for cheap obstacle sliding (ghost while escaping)
        const ux = dx / dist;
        const uy = dy / dist;
        const nx = this.x + ux * step;
        const ny = this.y + uy * step;
        const blocked = (ax: number, ay: number) => !this.escaping && this.collides(ax, ay);
        if (!blocked(nx, ny)) {
          this.x = nx;
          this.y = ny;
        } else if (!blocked(nx, this.y)) {
          this.x = nx;
        } else if (!blocked(this.x, ny)) {
          this.y = ny;
        } else {
          // fully blocked — give up on this target
          this.target = null;
          this.state = "idle";
          this.dwell = rand(0.8, 2);
        }
        this.phase += dt * (this.state === "run" ? 11 : 7.5) * (this.moveSpeed / WALK_SPEED);
        this.speed = this.moveSpeed;
        break;
      }

      case "look":
      case "curious":
      case "interact":
        if (this.stateT > this.stateLimit) {
          this.lookPoint = null;
          this.dwell = rand(0.6, 1.8);
          this.state = "idle";
        }
        break;

      case "sit":
        if (this.stateT > this.stateLimit) {
          this.enter("wake", 0.7);
        }
        break;

      case "wake":
        if (this.stateT > this.stateLimit) {
          this.state = "idle";
          this.dwell = rand(0.8, 2);
        }
        break;

      case "sleep":
        if (this.stateT > this.stateLimit) this.enter("wake", 0.9);
        break;

      case "wave":
      case "think":
      case "jump":
      case "celebrate":
      case "dance":
        if (this.stateT > this.stateLimit) {
          this.state = "idle";
          this.dwell = rand(0.8, 2.4);
        }
        break;

      case "idle":
      default:
        this.speed = 0;
        if (this.restricted) {
          // stay parked; tiny idle sway only
          break;
        }
        if (this.distracted || this.paused) break;
        this.dwell -= dt;
        // sleepy mood drifts into sleep on its own
        if (this.mood === "sleepy" && this.dwell <= -6) {
          this.enter("sleep", rand(6, 12));
          this.dwell = rand(6, 14);
          break;
        }
        if (this.dwell <= 0) this.pickBehavior();
        break;
    }

    this.clampIntoBounds();
    this.apply?.(this.pose());
  }

  // ----------------------------------------------------------------- pose

  private pose(): PoseFrame {
    const t = this.stateT;
    const moodSpeed = SPEED_BY_MOOD[this.mood];
    let rootY = 0;
    let rootRot = 0;
    let bodyY = 0;
    let legL = 0;
    let legR = 0;
    let legLiftL = 0;
    let legLiftR = 0;
    let armL = 0;
    let armR = 0;
    let headRot = 0;
    let headDX = 0;
    let headDY = 0;
    let sx = 1;

    const walking = this.state === "walk" || this.state === "run";
    const runLike = this.state === "run" || (walking && this.moveSpeed > WALK_SPEED * 1.3);

    // sit amount eases toward target
    const sitGoal = this.state === "sit" || this.state === "sleep" ? 1 : 0;
    this.sitAmt = lerp(this.sitAmt, sitGoal, 0.08);
    bodyY = this.sitAmt * 12;

    if (this.state === "turn") {
      const p = 1 - Math.max(0, this.turnT) / TURN_TIME;
      sx = 0.35 + 0.65 * Math.abs(Math.cos(p * Math.PI));
    }

    if (walking) {
      const amp = runLike ? 32 : 24;
      const freq = this.phase;
      const s = Math.sin(freq);
      legL = s * amp;
      legR = -s * amp;
      // foot lifts as each leg swings through
      legLiftL = -Math.max(0, s) * (runLike ? 7 : 5);
      legLiftR = -Math.max(0, -s) * (runLike ? 7 : 5);
      armL = -Math.sin(freq) * (runLike ? 26 : 18);
      armR = Math.sin(freq) * (runLike ? 26 : 18);
      rootY = -Math.abs(Math.cos(freq)) * (runLike ? 5 : 3);
      rootRot = (runLike ? 9 : 5) * this.facing;
    } else {
      // idle-family motion
      const breathe = Math.sin(performance.now() / 900) * 1.2;
      rootY = breathe * (this.state === "sleep" ? 0.4 : 1);
      armL = Math.sin(performance.now() / 1400) * 2;
      armR = -armL;
      legL = 0;
      legR = 0;
    }

    switch (this.state) {
      case "wave": {
        const w = Math.sin(t * 9) * 22;
        armR = -128 + w;
        armL = 14;
        headRot = -6 * this.facing;
        break;
      }
      case "look": {
        armL = 10;
        armR = -10;
        headRot = clamp(this.gaze.x * 3.2, -16, 16);
        headDX = clamp(this.gaze.x * 1.6, -5, 5);
        headDY = clamp(this.gaze.y * 1.4, -4, 4);
        break;
      }
      case "think": {
        headRot = 10 * this.facing;
        headDX = 4;
        headDY = -3;
        armR = -46;
        armL = 8;
        break;
      }
      case "sit":
      case "sleep": {
        legL = 52 * this.sitAmt;
        legR = -52 * this.sitAmt;
        armL = 18 * this.sitAmt;
        armR = -18 * this.sitAmt;
        if (this.state === "sleep") {
          rootRot = 4 * this.facing;
          headDY = 5 * this.sitAmt;
          headRot = 8 * this.facing;
        }
        break;
      }
      case "wake": {
        // rising: brief stretch
        armL = -70 + t * 120;
        armR = 70 - t * 120;
        rootY = -Math.sin(Math.min(1, t / this.stateLimit) * Math.PI) * 3;
        break;
      }
      case "jump": {
        const p = Math.min(1, t / this.stateLimit);
        rootY = -Math.sin(p * Math.PI) * 16;
        legL = 26;
        legR = -26;
        armL = 120 - p * 60;
        armR = -120 + p * 60;
        break;
      }
      case "celebrate": {
        const b = Math.abs(Math.sin(t * 7)) * -10;
        rootY = b - 4;
        legL = 14;
        legR = -14;
        armL = 132 + Math.sin(t * 7) * 10;
        armR = -132 - Math.sin(t * 7) * 10;
        headRot = Math.sin(t * 3.5) * 8;
        break;
      }
      case "dance": {
        const s = Math.sin(t * 6);
        const s2 = Math.sin(t * 3);
        armL = 120 - 70 * s;
        armR = -120 + 70 * s;
        legL = 18 * s;
        legR = -18 * s;
        rootY = -Math.abs(s2) * 7;
        rootRot = 7 * s2 * this.facing;
        headRot = 10 * s2;
        break;
      }
      case "interact": {
        // arrived near cursor: look at it, small wave of acknowledgement
        armR = -110 + Math.sin(t * 5) * 14;
        armL = 12;
        headRot = clamp(this.gaze.x * 3.4, -18, 18);
        headDX = clamp(this.gaze.x * 1.8, -6, 6);
        headDY = clamp(this.gaze.y * 1.6, -5, 5);
        break;
      }
      case "curious": {
        // leaning toward the thing it's inspecting
        if (this.lookPoint) {
          const dx = this.lookPoint.x - this.x;
          rootRot = clamp(dx * 0.02, -8, 8) * this.facing;
          headRot = clamp(this.gaze.x * 3, -18, 18);
          headDX = clamp(this.gaze.x * 1.5, -5, 5);
        }
        break;
      }
      default:
        break;
    }

    // mood overlays
    if (this.mood === "excited" && walking) rootY -= 1.5;
    if (this.mood === "focused") { armL *= 0.4; armR *= 0.4; }

    // head idle scan
    if (this.state === "idle" && !this.lookPoint) headRot += this.headScan * 0.4;

    // breathing squash
    const breath = 1 + Math.sin(performance.now() / (this.state === "sleep" ? 1400 : 1000)) * (this.state === "sleep" ? 0.02 : 0.008) * moodSpeed;

    const raw: PoseFrame = {
      x: this.x,
      y: this.y,
      facing: this.facing,
      sx,
      rootY,
      rootRot,
      bodyY,
      breath,
      legL,
      legR,
      legLiftL,
      legLiftR,
      armL,
      armR,
      headRot,
      headDX,
      headDY,
      pupilX: this.gaze.x,
      pupilY: this.gaze.y,
      zzz: this.zzzAmt * (this.state === "sleep" ? 1 : this.sitAmt),
    };
    return this.smoothPose(raw);
  }

  /** Exponential smoothing so state changes never snap. */
  private smooth: PoseFrame | null = null;
  private lastPoseMs = 0;

  private smoothPose(raw: PoseFrame): PoseFrame {
    const now = performance.now();
    const dt = this.lastPoseMs ? Math.min(0.1, (now - this.lastPoseMs) / 1000) : 0.016;
    this.lastPoseMs = now;
    if (!this.smooth) {
      this.smooth = { ...raw };
      return raw;
    }
    const k = 1 - Math.exp(-dt * 11);
    const o = this.smooth;
    const fields = [
      "sx", "rootY", "rootRot", "bodyY", "breath",
      "legL", "legR", "legLiftL", "legLiftR",
      "armL", "armR", "headRot", "headDX", "headDY", "zzz",
    ] as const;
    for (const f of fields) o[f] = o[f] + (raw[f] - o[f]) * k;
    // keep smoothed values but always use live kinematics
    return { ...o, x: raw.x, y: raw.y, facing: raw.facing, pupilX: raw.pupilX, pupilY: raw.pupilY };
  }
}
