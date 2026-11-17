"use client";

import { useEffect, useRef } from "react";

const TOKENS = [
  "0", "1", "{", "}", "(", ")", "[", "]", ";", "=>", "&&", "||",
  "int", "String", "class", "public", "static", "void", "new", "return",
  "System", "out", "println", "if", "else", "for", "while", "true", "false",
];

const COLORS = ["#8b7cf6", "#a78bfa", "#34d399", "#6ee7b7", "#7dd3fc", "#fbbf24"];

interface Drop {
  x: number;
  y: number;
  speed: number;
  size: number;
  token: string;
  color: string;
  alpha: number;
}

/**
 * Lightweight Java-themed code rain. Single canvas, rAF-driven,
 * pauses when hidden, respects prefers-reduced-motion (static scatter).
 */
export function CodeRain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let drops: Drop[] = [];
    let w = 0;
    let h = 0;

    const seed = () => {
      drops = Array.from({ length: Math.min(48, Math.floor(w / 36)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        speed: 0.25 + Math.random() * 0.7,
        size: 10 + Math.random() * 8,
        token: TOKENS[(Math.random() * TOKENS.length) | 0],
        color: COLORS[(Math.random() * COLORS.length) | 0],
        alpha: 0.08 + Math.random() * 0.22,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = (staticOnly: boolean) => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = "600 13px var(--font-geist-mono), monospace";
      ctx.textAlign = "center";
      for (const d of drops) {
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle = d.color;
        ctx.font = `600 ${d.size}px var(--font-geist-mono), monospace`;
        ctx.fillText(d.token, d.x, d.y);
        if (!staticOnly) {
          d.y += d.speed;
          if (d.y > h + 30) {
            d.y = -30;
            d.x = Math.random() * w;
            d.token = TOKENS[(Math.random() * TOKENS.length) | 0];
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      draw(false);
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) {
      draw(true); // static scatter only
    } else {
      const start = () => { if (!document.hidden) { loop(); } };
      const onVis = () => {
        if (document.hidden) {
          cancelAnimationFrame(raf);
          raf = 0;
        } else if (!raf) {
          raf = requestAnimationFrame(loop);
        }
      };
      start();
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("resize", resize);
      return () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("resize", resize);
      };
    }
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
