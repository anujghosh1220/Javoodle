import type { AtmosphereConfig } from "./types";

/**
 * Javoodle Atmosphere Engine.
 *
 * A single <canvas> + a single requestAnimationFrame loop renders all
 * canvas-based layers in coordinated passes:
 *   1. Neural particle field (nodes, links, cursor repulsion)
 *   2. Orbital knowledge particles
 *   3. Matrix-style Java code rain
 *
 * DOM layers (aurora, grid, cursor light, holograms) live in AtmosphereOverlay.
 * Everything pauses on hidden tabs, scales with intensity, and goes fully
 * static/off under reduced-motion or calm (exam) configs.
 */

const RAIN_TOKENS = [
  "0", "1", "{", "}", "(", ")", "[", "]", ";", "=>", "&&", "||", "==", "!=",
  "<=", ">=", "++", "--", "->", "::", "@", "?", "!", "~", "...",
  "public", "private", "protected", "class", "interface", "extends",
  "implements", "import", "package", "static", "final", "abstract",
  "void", "int", "double", "boolean", "char", "long", "float", "byte",
  "String", "System", "out", "println", "args", "new", "return", "if",
  "else", "for", "while", "do", "switch", "case", "break", "continue",
  "try", "catch", "throw", "throws", "this", "super", "null", "true",
  "false", "instanceof", "List", "ArrayList", "HashMap", "Integer",
  "String[]", "main", "print", "scan", "nextInt", "equals", "length",
];

const RAIN_SNIPPETS = [
  "System.out.println()",
  "public class Main",
  "new Student()",
  "for(int i=0;i<n;i++)",
  "private static final",
  "ArrayList<String>",
  "String[] args",
  "void main()",
  "import java.util.*",
  "class Student { }",
];

const ACCENT_COLORS: Record<NonNullable<AtmosphereConfig["accent"]>, string[]> = {
  purple: ["#a855f7", "#8b5cf6", "#c084fc", "#22d3ee"],
  cyan: ["#22d3ee", "#34d399", "#a855f7", "#67e8f9"],
  emerald: ["#34d399", "#6ee7b7", "#22d3ee", "#a855f7"],
  mixed: ["#a855f7", "#8b5cf6", "#34d399", "#22d3ee", "#c084fc", "#fbbf24"],
};

interface RainDrop {
  x: number; y: number; speed: number; size: number;
  token: string; snippet: boolean; color: string; alpha: number;
  depth: number; bright: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; depth: number; color: string; phase: number;
}

interface Orbital {
  cx: number; cy: number; driftX: number; driftY: number;
  radius: number; angle: number; speed: number;
  dots: { offset: number; r: number }[];
  color: string; alpha: number;
}

const MAX_PARTICLES = 110;
const MAX_RAIN = 56;
const MAX_ORBITALS = 5;
const LINK_DIST = 130;
const CURSOR_RADIUS = 150;

function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function pick<T>(arr: T[]): T { return arr[(Math.random() * arr.length) | 0]; }

export class AtmosphereEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private getConfig: () => AtmosphereConfig;
  private raf = 0;
  private running = false;
  private w = 0;
  private h = 0;
  private pointer = { x: -9999, y: -9999, inside: false };
  private rain: RainDrop[] = [];
  private particles: Particle[] = [];
  private orbitals: Orbital[] = [];
  private t = 0;
  private reducedOS = false;
  private staticDrawn = false;

  constructor(canvas: HTMLCanvasElement, getConfig: () => AtmosphereConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.getConfig = getConfig;
    this.reducedOS = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.resize();
    this.seed();

    window.addEventListener("resize", this.resize);
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    document.addEventListener("visibilitychange", this.onVis);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = (e: MediaQueryListEvent) => {
      this.reducedOS = e.matches;
      this.staticDrawn = false;
      this.apply();
    };
    mq.addEventListener("change", onMq);
    this.mqCleanup = () => mq.removeEventListener("change", onMq);
  }

  private mqCleanup: (() => void) | null = null;

  private onPointer = (e: PointerEvent) => {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.inside = true;
  };

  private onVis = () => {
    if (document.hidden) {
      this.stopLoop();
    } else {
      this.apply();
    }
  };

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seed();
    this.staticDrawn = false;
    this.apply();
  };

  private colors(): string[] {
    return ACCENT_COLORS[this.getConfig().accent] ?? ACCENT_COLORS.purple;
  }

  private seed() {
    const cfg = this.getConfig();
    const palette = this.colors();
    const area = (this.w * this.h) / (1440 * 900);

    // Rain
    const rainCount = Math.round(Math.min(MAX_RAIN, Math.floor(this.w / 34)) * (cfg.rain || 0));
    this.rain = Array.from({ length: rainCount }, () => this.makeDrop(palette, true));

    // Neural particles — bounded count scaled by intensity + screen area.
    const pCount = Math.round(Math.min(MAX_PARTICLES, 26 + area * 46) * (cfg.particles || 0));
    this.particles = Array.from({ length: pCount }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: rand(-0.16, 0.16),
      vy: rand(-0.12, 0.12),
      r: rand(0.8, 2.1),
      depth: rand(0.35, 1),
      color: pick(palette),
      phase: Math.random() * Math.PI * 2,
    }));

    // Orbitals — sparse decorative systems.
    const oCount = Math.round(MAX_ORBITALS * (cfg.orbitals || 0));
    this.orbitals = Array.from({ length: oCount }, () => ({
      cx: rand(this.w * 0.1, this.w * 0.9),
      cy: rand(this.h * 0.15, this.h * 0.85),
      driftX: rand(-0.08, 0.08),
      driftY: rand(-0.05, 0.05),
      radius: rand(46, 110),
      angle: Math.random() * Math.PI * 2,
      speed: rand(0.0015, 0.004) * (Math.random() < 0.5 ? 1 : -1),
      dots: Array.from({ length: 2 + ((Math.random() * 2) | 0) }, () => ({
        offset: Math.random() * Math.PI * 2,
        r: rand(1.4, 2.6),
      })),
      color: pick(palette),
      alpha: rand(0.10, 0.2),
    }));
  }

  private makeDrop(palette: string[], anywhere: boolean): RainDrop {
    const snippet = Math.random() < 0.07;
    const bright = Math.random() < 0.12;
    return {
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : rand(-this.h * 0.4, -20),
      speed: rand(0.22, 0.85) * (snippet ? 0.7 : 1),
      size: snippet ? rand(9, 11) : rand(10, 17),
      token: snippet ? pick(RAIN_SNIPPETS) : pick(RAIN_TOKENS),
      snippet,
      color: bright ? "#e9d5ff" : pick(palette),
      alpha: bright ? rand(0.3, 0.45) : rand(0.07, 0.2),
      depth: rand(0.4, 1),
      bright: bright ? 1 : 0,
    };
  }

  /** Re-seed layer populations (intensity changes) then re-apply run state. */
  reseed() {
    this.seed();
    this.apply();
  }

  /** Re-evaluate whether the loop should run; called on config/visibility changes. */
  apply() {
    const cfg = this.getConfig();
    const motionAllowed = !this.reducedOS && !cfg.calm && !cfg.off;
    if (!motionAllowed) {
      this.stopLoop();
      if (cfg.off) {
        this.ctx.clearRect(0, 0, this.w, this.h);
        this.staticDrawn = true;
      } else if (!this.staticDrawn) {
        this.drawFrame(true);
        this.staticDrawn = true;
      }
      return;
    }
    this.staticDrawn = false;
    this.startLoop();
  }

  private startLoop() {
    if (this.running || document.hidden) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.loop);
  }

  private stopLoop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private loop = () => {
    if (!this.running) return;
    this.drawFrame(false);
    this.raf = requestAnimationFrame(this.loop);
  };

  private drawFrame(staticOnly: boolean) {
    const { ctx, w, h } = this;
    const t = (this.t += staticOnly ? 0 : 1 / 60);
    ctx.clearRect(0, 0, w, h);

    // Subtle depth vignette keeps edges calm.
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, "rgba(8,13,27,0)");
    vg.addColorStop(1, "rgba(8,13,27,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    this.drawOrbitals(staticOnly, t);
    this.drawParticles(staticOnly, t);
    this.drawRain(staticOnly);
  }

  private drawParticles(staticOnly: boolean, t: number) {
    const { ctx, w, h } = this;
    const ptr = this.pointer;
    const cursorActive = ptr.inside && !staticOnly;

    for (const p of this.particles) {
      if (!staticOnly) {
        p.x += p.vx * p.depth;
        p.y += p.vy * p.depth;
        // gentle cursor repulsion — no chasing
        if (cursorActive) {
          const dx = p.x - ptr.x;
          const dy = p.y - ptr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < CURSOR_RADIUS * CURSOR_RADIUS && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = ((CURSOR_RADIUS - d) / CURSOR_RADIUS) * 0.35;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }
        }
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
      }
      const twinkle = staticOnly ? 0.75 : 0.65 + 0.35 * Math.sin(t * 1.4 + p.phase);
      ctx.globalAlpha = 0.5 * p.depth * twinkle;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.depth, 0, Math.PI * 2);
      ctx.fill();
    }

    // Connections — O(n²) bounded by MAX_PARTICLES.
    const linkAlpha = 0.10;
    for (let i = 0; i < this.particles.length; i++) {
      const a = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > LINK_DIST * LINK_DIST) continue;
        const d = Math.sqrt(d2);
        let alpha = (1 - d / LINK_DIST) * linkAlpha * Math.min(a.depth, b.depth);
        // brighten slightly near cursor
        if (cursorActive) {
          const mx = (a.x + b.x) / 2 - ptr.x;
          const my = (a.y + b.y) / 2 - ptr.y;
          if (mx * mx + my * my < CURSOR_RADIUS * CURSOR_RADIUS) alpha *= 1.8;
        }
        ctx.globalAlpha = Math.min(alpha, 0.22);
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawOrbitals(staticOnly: boolean, t: number) {
    const { ctx } = this;
    for (const o of this.orbitals) {
      if (!staticOnly) {
        o.cx += o.driftX;
        o.cy += o.driftY;
        o.angle += o.speed;
        if (o.cx < -140) o.cx = this.w + 140; else if (o.cx > this.w + 140) o.cx = -140;
        if (o.cy < -140) o.cy = this.h + 140; else if (o.cy > this.h + 140) o.cy = -140;
      }
      const breathe = staticOnly ? 1 : 0.85 + 0.15 * Math.sin(t * 0.6 + o.angle * 3);
      const alpha = o.alpha * breathe;
      // fine orbital path
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(o.cx, o.cy, o.radius, 0, Math.PI * 2);
      ctx.stroke();
      // glowing core
      ctx.globalAlpha = alpha * 1.6;
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.arc(o.cx, o.cy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // orbiting points
      for (const d of o.dots) {
        const a = o.angle + d.offset;
        const px = o.cx + Math.cos(a) * o.radius;
        const py = o.cy + Math.sin(a) * o.radius * 0.62; // slight ellipse
        ctx.globalAlpha = alpha * 1.8;
        ctx.beginPath();
        ctx.arc(px, py, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawRain(staticOnly: boolean) {
    const { ctx, h } = this;
    for (const d of this.rain) {
      if (!staticOnly) {
        d.y += d.speed * d.depth;
        if (d.y > h + 30) {
          Object.assign(d, this.makeDrop(this.colors(), false));
          d.y = -30;
        }
      }
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      ctx.font = `600 ${d.size}px var(--font-geist-mono), monospace`;
      ctx.textAlign = "center";
      ctx.fillText(d.token, d.x, d.y);
    }
    ctx.globalAlpha = 1;
  }

  destroy() {
    this.stopLoop();
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.onPointer);
    document.removeEventListener("visibilitychange", this.onVis);
    this.mqCleanup?.();
  }
}
