# Javoodle Atmosphere — Functional Test Report

## Settings audit (all verified in browser unless noted)

### Presets
| Preset | Verified behaviour |
|---|---|
| Auto | Per-route config (rain/particles/aurora/holograms differ by page — probed) |
| Matrix | rain≈0.85-scaled, particles low, holograms off — captured `settings-matrix` |
| Neural | particles≈0.95, orbitals up, holograms off — captured |
| Aurora | aurora=1, minimal canvas — captured (aurora:3 blobs present) |
| Minimal | all canvas layers 0, cursor light off, near-still aurora — captured |

### Toggles
- Background effects: ✅ off → canvas `nonZero=0`, overlay layers unmounted.
- Cursor lighting: ✅ rAF-driven glow; disabled in calm/off states.
- Holographic effects: ✅ toggle respected (`holo` count 8→0 verified).
- Reduced motion (in-app): ✅ forces `config.off` — same path as effects-off.
- Sound effects: **disabled control, "Coming soon"** — no audio backend exists; nothing fabricated. (`prefs.sound` sanitized to `false` on load.)

### Intensity sliders
Matrix/particle/aurora sliders scale `cfg.rain/particles/orbitals` and aurora opacity respectively (unit-tested: 0% → 0 layers). Persistence verified via reload.

### Persistence
- Key `javoodle.atmosphere.v1` ✅ read/write verified.
- **Bug found & fixed**: StrictMode double-effect caused `savePrefs(DEFAULT_PREFS)` to clobber stored prefs on every fresh load — stored `effects:false` was being rewritten to `true`. Fixed with a `hydrated` gate; re-verified stored value survives reload.
- Malformed JSON → `sanitize()` falls back per-field to defaults ✅ (also guards wrong types → clamps 0–100, invalid mode → `auto`, `sound` forced `false`).
- Missing localStorage (SSR/private mode) → try/catch → defaults ✅.
- Changes apply live via React state — no reload needed ✅ (UI preset clicks took effect without navigation).

### Reduced motion
- OS-level (`reducedMotion:"reduce"` emulation): canvas pixel-diff = 0 over 1.2 s, aurora/holograms absent ✅.
- In-app toggle: same `config.off` path ✅.
- Content remains fully usable; only decorative motion stops.

## Exam mode (priority check)

- Route regex `^/exams/[^/]+/take` → calm config; **overrides forced user modes** (fixed this pass — previously `forced` could reset `calm=false`).
- Unit tests: 8 cases in `tests/atmosphere.test.ts` cover calm-forced, effects-off, minimal, admin restraint, landing richness, coding grid, slider scaling, OS reduced-motion — **96/96 tests pass**.
- Live exam-take UI: **blocked** — no published exam for the test student; documented, not fabricated.

## Regression

- `npx tsc --noEmit` ✅ clean
- `npm run lint` ✅ 0 errors (8 warnings, all in QA `.mjs` scripts / pre-existing audit script)
- `npm run test` ✅ 11 files / 96 tests
- `npm run build` ✅ all 37 routes compile
- Student login (name form → dashboard) ✅ exercised repeatedly
- Learn detail, practice session + answer feedback, coding list + Monaco workspace, playground, growth, exams list ✅ all navigated and captured with zero console errors

## Blocked / not run

- Admin-authenticated pages (no credentials).
- Live exam attempt (no published exam fixture; creating content was out of scope).
- Robot roaming/collision behaviour unchanged — aura is a passive CSS layer behind the robot; no interaction path modified.
