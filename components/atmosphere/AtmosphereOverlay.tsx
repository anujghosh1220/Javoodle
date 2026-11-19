"use client";

import { useEffect, useRef } from "react";
import { useAtmosphere } from "./AtmosphereProvider";

/**
 * DOM/CSS atmosphere layers rendered above the shared canvas and below
 * all content: digital aurora, cyber grid, cursor light, holograms.
 * All layers are pointer-events-none and driven purely by the resolved
 * AtmosphereConfig — no per-frame React state.
 */

const HOLOGRAMS = [
  { text: "public class Main", top: "12%", left: "6%", delay: "0s", dur: "11s", size: "13px" },
  { text: "System.out.println()", top: "22%", right: "8%", delay: "2.4s", dur: "13s", size: "12px" },
  { text: "new Student()", top: "58%", left: "4%", delay: "4s", dur: "12s", size: "12px" },
  { text: "for(int i=0;i<n;i++)", top: "70%", right: "6%", delay: "1.2s", dur: "14s", size: "11px" },
  { text: "private static final", top: "38%", left: "12%", delay: "3s", dur: "10s", size: "11px" },
  { text: "ArrayList<String>", top: "82%", right: "14%", delay: "5s", dur: "12s", size: "12px" },
  { text: "void main(String[] args)", top: "45%", right: "18%", delay: "6s", dur: "15s", size: "11px" },
  { text: "{ } () ; => && ||", top: "30%", left: "22%", delay: "7s", dur: "13s", size: "12px" },
];

export function AtmosphereOverlay() {
  const { config, prefs } = useAtmosphere();
  const lightRef = useRef<HTMLDivElement>(null);

  // Cursor light — rAF-throttled CSS variable updates, no React renders.
  useEffect(() => {
    if (!config.cursorLight || config.calm || config.off) return;
    const el = lightRef.current;
    if (!el) return;
    let raf = 0;
    let tx = -9999;
    let ty = -9999;
    let cx = -9999;
    let cy = -9999;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      visible = true;
    };
    const onLeave = () => { visible = false; };

    let lastOpacity = "";
    let lastTransform = "";
    const tick = () => {
      // exponential smoothing — no abrupt jumps; skip writes once settled
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      const op = visible ? "1" : "0";
      const tr = `translate3d(${Math.round(cx - 260)}px, ${Math.round(cy - 260)}px, 0)`;
      if (op !== lastOpacity) {
        el.style.opacity = op;
        lastOpacity = op;
      }
      if (tr !== lastTransform) {
        el.style.transform = tr;
        lastTransform = tr;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [config.cursorLight, config.calm, config.off]);

  const auroraOn = config.aurora > 0.02 && !config.off;
  const gridOn = config.grid > 0.02 && !config.off;
  const holoOn = config.holograms && prefs.holograms && !config.calm && !config.off;
  const lightOn = config.cursorLight && !config.calm && !config.off;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {/* Layer 3 — digital aurora (slow transform drift, GPU-cheap) */}
      {auroraOn && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: Math.min(config.aurora * prefs.auroraIntensity / 60, 1) }}
        >
          <div
            className="atmo-aurora atmo-aurora-a"
            style={{
              background:
                "radial-gradient(closest-side, rgba(168,85,247,0.20), rgba(139,92,246,0.07) 55%, transparent 75%)",
            }}
          />
          <div
            className="atmo-aurora atmo-aurora-b"
            style={{
              background:
                "radial-gradient(closest-side, rgba(52,211,153,0.14), rgba(34,211,238,0.06) 55%, transparent 75%)",
            }}
          />
          <div
            className="atmo-aurora atmo-aurora-c"
            style={{
              background:
                "radial-gradient(closest-side, rgba(34,211,238,0.13), rgba(168,85,247,0.05) 60%, transparent 78%)",
            }}
          />
        </div>
      )}

      {/* Layer 5 — cyber grid (static gradients, barely-there opacity) */}
      {gridOn && (
        <div
          className="absolute inset-0"
          style={{
            opacity: Math.min(config.grid, 0.5),
            backgroundImage:
              "linear-gradient(rgba(139,92,246,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.14) 1px, transparent 1px), linear-gradient(rgba(34,211,238,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.10) 1px, transparent 1px)",
            backgroundSize: "72px 72px, 72px 72px, 360px 360px, 360px 360px",
            maskImage:
              "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 85%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 70% at 50% 30%, black 30%, transparent 85%)",
          }}
        />
      )}

      {/* Layer 4 — floating Java holograms */}
      {holoOn &&
        HOLOGRAMS.map((hg) => (
          <span
            key={hg.text}
            className="atmo-holo"
            style={{
              top: hg.top,
              left: "left" in hg ? hg.left : undefined,
              right: "right" in hg ? hg.right : undefined,
              fontSize: hg.size,
              animationDuration: hg.dur,
              animationDelay: hg.delay,
            }}
          >
            {hg.text}
          </span>
        ))}

      {/* Cursor light — soft radial glow, transform-driven */}
      {lightOn && (
        <div
          ref={lightRef}
          className="absolute left-0 top-0 h-[520px] w-[520px] opacity-0 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(closest-side, rgba(168,85,247,0.07), rgba(34,211,238,0.045) 45%, transparent 72%)",
            willChange: "transform",
          }}
        />
      )}
    </div>
  );
}
