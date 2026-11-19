"use client";

import { useEffect, useState } from "react";

const WORD = "JAVOODLE";
const GLYPHS = "X#0K7&@%$<>/\\|=+*?~^;:";
const DECODE_MS = 1500;
// Module-level once-flag: survives component remounts across client
// navigations so the decode never replays within a session.
let decodePlayed = false;

/**
 * Javoodle wordmark — scramble decode once on mount, then continuous
 * CSS gradient flow. SSR-safe (renders final text server-side),
 * reduced-motion → static gradient, accessible (aria-label = JAVOODLE).
 */
export function Wordmark({ className = "", accentClass = "text-lav-400" }: { className?: string; accentClass?: string }) {
  const [text, setText] = useState(WORD);
  const [decoded, setDecoded] = useState(decodePlayed);

  useEffect(() => {
    if (decodePlayed) {
      const id = requestAnimationFrame(() => setDecoded(true));
      return () => cancelAnimationFrame(id);
    }
    decodePlayed = true;
    let tick: ReturnType<typeof setInterval> | null = null;
    const id = requestAnimationFrame(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDecoded(true);
        return;
      }
      const start = performance.now();
      tick = setInterval(() => {
        const t = (performance.now() - start) / DECODE_MS;
        if (t >= 1) {
          if (tick) clearInterval(tick);
          setText(WORD);
          setDecoded(true);
          return;
        }
        // progressive decode: char i locks once t > (i+1)/len
        let out = "";
        for (let i = 0; i < WORD.length; i++) {
          const lockAt = (i + 1) / WORD.length;
          if (t >= lockAt) out += WORD[i];
          else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        setText(out);
      }, 50);
    });
    return () => {
      cancelAnimationFrame(id);
      if (tick) clearInterval(tick);
    };
  }, []);

  return (
    <span
      className={`javoodle-wordmark ${decoded ? "is-decoded" : ""} ${className}`}
      role="img"
      aria-label="JAVOODLE"
    >
      <span className="sr-only">JAVOODLE</span>
      <span aria-hidden="true" className="javoodle-wordmark-text">
        {text.split("").map((ch, i) => {
          const isO = WORD[i] === "O";
          const isFinalE = i === WORD.length - 1;
          return (
            <span key={i} className={isO ? accentClass : isFinalE ? "text-mint-500" : undefined}>
              {ch}
            </span>
          );
        })}
      </span>
    </span>
  );
}
