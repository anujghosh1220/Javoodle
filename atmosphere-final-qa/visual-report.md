# Javoodle Atmosphere — Visual QA Report

Date: 2026-11-19 · Environment: Windows, Next.js 16 dev server, Playwright Chromium.
Viewports: 1440×900, 1920×1080, 1366×768 (desktop only, per scope).

## Method honesty statement

Screenshots were captured with Playwright and are stored in `screenshots/` (29 PNGs).
Pixel-level "visual inspection" was performed **programmatically** — canvas pixel
sampling, DOM layer counts, overlay opacity probes, bounding-box/overflow checks —
because this audit environment cannot render images to a human/vision reviewer.
Where a criterion required human judgement (e.g. "does the aurora feel overpowering"),
it is marked **INFERRED** and should get a human glance at the PNGs.

## Verified results (measured in browser)

| Check | Result |
|---|---|
| Exactly one atmosphere canvas (`#javoodle-atmosphere`) on every route | ✅ `canvasCount=1`, `atmoCanvasCount=1` after 8-route navigation loop |
| No horizontal overflow at any tested resolution | ✅ `overflowX=false` on all probed routes |
| Per-preset DOM layers respond correctly | ✅ holograms=8 on dashboard/learn/playground/landing; 0 on practice/coding/growth/exams; aurora blobs present except forced-off states |
| Forced modes (Matrix/Neural/Aurora/Minimal) apply and persist | ✅ re-captured after persistence fix; `stored.mode` matches selection after reload |
| Effects-off clears the canvas completely | ✅ `canvasNonZero=0` (was **broken before fix**, see issues-fixed.md) |
| Malformed localStorage (`{not json!!`) | ✅ app boots, canvas mounts, defaults used |
| Zero console/page errors across all captures | ✅ `console-errors.json` = `[]` |
| Robot companion aura present and mood-driven | ✅ `.robot-aura.robot-aura-happy` rendered on dashboard |
| Practice feedback state captured | ✅ `practice-feedback-1920x1080.png` (post-answer card with emerald/amber styling + particle burst code path) |
| Coding workspace with Monaco captured | ✅ `coding-workspace-1920x1080.png` (3.5 s settle for editor init) |

## Captured routes (see manifest.json for full list)

- Landing ×3 resolutions — richest preset active.
- Student: dashboard, learn (+detail), practice (+live session +feedback), coding list, coding workspace (Monaco), playground, growth, exams — all at 1920×1080; dashboard/coding/learn also at 1440×900 and 1366×768.
- Settings states: default, matrix, neural, aurora, minimal, fx-off, reduced-motion — all at 1920×1080 on dashboard.
- Admin login + unauthenticated `/admin` redirect — 1920×1080.

## Inferred results (code-verified, not pixel-verified)

- **Exam focus mode**: no published exam exists for the test student, so `/exams/[id]/take` could not be screenshotted live. `resolveConfig` forces `calm` (rain 0.04, particles 0.05, no holograms/cursor/grid) for `^/exams/[^/]+/take` and this **overrides user-forced modes** — covered by 8 unit tests in `tests/atmosphere.test.ts`. INFERRED calm, unit-verified.
- **Admin dashboard interior**: no admin credentials available (Supabase `app_metadata.role=admin` required). Only login + redirect captured. Admin preset is code-verified restrained (rain 0.16, particles 0.32, no holograms).
- **Aesthetic judgement** (restraint, contrast feel, "doesn't compete with content"): all layers are capped at low alpha by design (rain ≤0.45, links ≤0.22, aurora ≤0.20 radial alpha, holograms 0.09, grid masked radial). Human review of PNGs recommended.

## Blocked tests

- Live exam-take screenshot — no published exam fixture for student "Ava"; creating one would require admin access or real content writes (prohibited).
- Admin panel interior — no credentials.
- 10-minute continuous-use soak — not run; heap stability across rapid navigation was measured instead (see performance-report.md).
