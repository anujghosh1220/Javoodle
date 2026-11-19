# Animated Wordmark — Report

## Files changed
- `components/ui/Wordmark.tsx` (new) — shared wordmark: scramble decode (~1.5s, progressive left→right lock, glyphs X#0K7&@%$<>/\|=+*?~^;:) then continuous CSS gradient flow (lav→cyan→lav, 5s seamless loop, background-clip:text).
- `app/globals.css` — `.javoodle-wordmark` / `.is-decoded` / `wordmark-flow` keyframes + reduced-motion disable.
- `components/student/StudentNav.tsx`, `app/page.tsx`, `components/admin/AdminNav.tsx` — replaced inline `Jav..oo..dl..e` spans with `<Wordmark/>` (all 3 usage sites; no duplicates created).

## Behavior
SSR renders final "JAVOODLE" (no hydration mismatch); client effect decodes once (played-ref + rAF gate, StrictMode-safe, no replay on rerenders/navigation). Gradient animates only after decode (`is-decoded`); reduced-motion → static decoded gradient. Accessible: role=img + aria-label="JAVOODLE" + sr-only text; scrambled glyphs aria-hidden. Accent letters ("oo" lav, final "e" mint) preserved per usage via accentClass.

## Verification
- tsc: PASS · ESLint: 0 errors (fixed setState-in-effect via rAF + proper interval cleanup) · Vitest: 106/106 · next build: PASS
- NOT TESTED: live visual decode in browser this pass (component compiled; animation is CSS+interval, deterministic timing), pixel review of gradient.
