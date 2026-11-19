# Atmosphere Repair & Always-On Sound — Report

## Root cause (Phase 1)
NOT an application bug. Canvas pixel-probe proved the engine works: landing sampled ~9784 non-zero alpha pixels. The reported "effects not working" was a **stale production server** — :3001 predated the latest `.next` build, causing chunk mismatches (`Failed to load chunk`) and an empty canvas (0 sampled pixels) after client navigation. After restarting `npm start` on the current build: dashboard canvas samples ~9805 px, zero console errors.

## Browser-verified (Playwright, prod build)
Canvas non-zero pixel counts per route: landing 4907, dashboard 4908, learn 4905, practice 4904, growth 4911, coding 4904, missions 4906, playground 4903, visualizer 4903, projects 4904, exams 4903 — atmosphere rendering on EVERY route (single canvas, single rAF preserved). Atmosphere card on /dashboard shows description, ZERO sound toggles anywhere. No console errors.

## Changes
- `SoundBridge.tsx`: removed prefs.sound dependency — `setSoundEnabled(true)` always; event→sound mapping, exam-route mute, hidden-tab mute, gesture-unlock all preserved. No fake events.
- `presets.ts` sanitize: `sound: true` always — old persisted `sound:false` can no longer disable audio (v2 prefs migrate implicitly on next save).
- `AtmosphereSettings.tsx`: removed Sound On/Off button + aria-pressed; removed misleading "ACTIVE" badge → neutral status card ("Javoodle's immersive learning environment" + adaptive-description line).
- `types.ts`/DEFAULT_PREFS unchanged otherwise; engine, presets, resolveConfig untouched.

## Verified
- tsc: PASS · ESLint: 0 errors · Vitest: 106/106 · next build: PASS
- Exam route still renders (calm preset unchanged — config-level, previously verified); reduced-motion path untouched.

## NOT TESTED
- Audible output in real browser (no audio device); exam-route live mute re-check this pass; per-route intensity differences verified via config not pixel-diff.
