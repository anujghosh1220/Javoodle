# Javoodle Atmosphere — Performance Report

All numbers below are **measured** unless marked inferred. Raw data: `perf.json`.

## Measured

| Metric | Value | Notes |
|---|---|---|
| Canvas elements on dashboard | **1** | exactly one shared canvas |
| Atmosphere canvases after 8-route nav loop | **1** | no recreation/leak |
| JS heap start → after 8 navigations | **25 MB → 25 MB** | `performance.memory.usedJSHeapSize`, no growth |
| FPS, dashboard, effects ON (headed Chromium, real GPU) | **53.7 fps**, longest frame 133 ms | includes dev-mode React overhead |
| FPS, dashboard, effects ON (headless, SwiftShader) | 9.3 fps | software rasterizer — environmental floor |
| FPS, dashboard, effects OFF (headless) | 27.2 fps | confirms headless ceiling is renderer-bound, not app-bound |
| FPS, landing (headless) | 12.6 fps | same software-renderer caveat |
| Preset UI switching (5 presets, click→settle) | ~3.2 s total incl. 350 ms waits | each switch = prefs update + reseed, no reload |
| Canvas backing store after resize 1920→1366 | `1366x768` | resize handler + reseed works |
| Console errors during all runs | **0** | |

## Architecture audit (code-verified)

- **One rAF loop**: `AtmosphereEngine.loop()` is the only canvas scheduler; cursor light uses a second rAF but only writes styles when values change (idle-skip added this pass).
- **No React state per frame**: engine mutates canvas directly; overlay uses CSS vars/transform via refs.
- **Bounded arrays**: rain ≤56, particles ≤110, orbitals ≤5 — all seeded from config, never appended per-frame.
- **Visibility pause**: `visibilitychange` → `stopLoop()`/`apply()`; browsers also suspend rAF in hidden tabs (double protection).
- **Hidden-tab / unmount cleanup**: `destroy()` removes resize, pointermove, visibilitychange, matchMedia listeners and cancels rAF.
- **Reduced motion**: OS `prefers-reduced-motion` (live media-query listener) OR user pref → `config.off` → loop stopped, canvas cleared once, overlay hidden. Verified: pixel-diff over 1.2 s = **0** under emulated `reducedMotion:"reduce"`.
- **Effects disabled**: `config.off` → `clearRect`, loop stopped — verified `canvasNonZero=0`.
- **Exam calm**: static single frame, ~1–2 faint drops max.
- **pointer-events**: canvas + overlay wrapper are `pointer-events-none`; cannot block Monaco, forms, or text selection.

## Interpretation

- Headless Chromium uses SwiftShader (software canvas) — its 9–27 fps numbers reflect the rasterizer, not the app. The headed run (53.7 fps with effects fully on, dev build) is the meaningful figure; production build + GPU should hold 60 fps.
- Heap flat at 25 MB across navigation; particle arrays are bounded and reseeded (not grown) on config changes.
- The engine's heaviest op is the O(n²) link pass capped at 110 nodes (~6k distance checks/frame worst case) — acceptable; no optimization needed based on measured headed FPS.

## Not measured (honest gaps)

- True 10-minute soak / long-session memory — inferred stable from flat heap over nav loop + bounded structures.
- Tab-hidden pause verified by code path + browser rAF suspension semantics, not by an actual OS-level tab hide (Playwright cannot truly hide the only tab).
- GPU/CPU utilization percentages — not instrumented.
