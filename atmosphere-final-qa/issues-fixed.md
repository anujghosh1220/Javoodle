# Issues Found & Fixed During Final QA

## 1. Stored preferences clobbered on every fresh page load — FIXED

**Severity:** high (broke persistence + all reload-based preset testing)
**Root cause:** React StrictMode double-invokes effects in dev. The persist
effect's "skip first run" guard (`loaded` ref) stayed `true` on the second
pass, so `savePrefs(DEFAULT_PREFS)` wrote defaults to
`localStorage["javoodle.atmosphere.v1"]` *before* the rAF-deferred `loadPrefs()`
read it — silently erasing the user's saved settings on every load.
**Evidence:** `debug3.mjs` — wrote `effects:false`, reloaded, stored value came
back `effects:true`.
**Fix:** `AtmosphereProvider` now gates persistence on a `hydrated` state flag
set in the same rAF that loads prefs. Defaults are never written before the
stored values are read.
**Verified:** stored `effects:false` survives reload; `holo`/`aurora` counts = 0.

## 2. Sound toggle implied functionality that doesn't exist — FIXED

The toggle was interactive with a "Coming soon" hint. Per spec, disabled the
control entirely (keeps the row visible, communicates roadmap honestly).
`sanitize()` also forces `sound:false` on load so stale stored values can't
imply audio.

## 3. `loadPrefs` accepted malformed value *types* — FIXED

`{...DEFAULT_PREFS, ...JSON.parse(raw)}` passed through e.g.
`matrixIntensity:"abc"` → `NaN` downstream. Added `sanitize()`: per-field type
checks, clamps intensities to 0–100, validates `mode` against the enum,
forces `sound:false`.

## 4. Cursor-light rAF wrote styles every frame even when idle — FIXED

The overlay's animation loop rewrote `opacity`/`transform` unconditionally
each frame. Added last-value caching so DOM writes only occur when the
smoothed values actually change.

## 5. Canvas not cleared when effects disabled (latent, found via probe) — VERIFIED FIXED

An earlier pass added the `cfg.off → clearRect` path; this audit confirmed it
works end-to-end (`canvasNonZero=0` after reload with `effects:false`). The
first QA run's nonzero reading was actually symptom #1 (prefs clobbered →
effects stayed on), not an engine bug.

## 6. Forced atmosphere modes could override exam calm — FIXED (previous pass, regression-tested)

`forcedMode()` results were applied even on `/exams/[id]/take`. Now guarded by
`!calm`; covered by unit tests including all 4 forced modes on exam routes.

## Not issues (checked, no action needed)

- Single canvas / single engine loop / bounded particle arrays — confirmed.
- Event listeners: engine `destroy()` removes all; provider effects clean up.
- No hydration mismatch: prefs load post-mount via rAF; SSR and first client
  render both use `DEFAULT_PREFS`.
- Robot aura is a static CSS layer (`filter: blur` radial) — no JS cost,
  mood class only.
- Grid uses static gradients + mask — no animated filter cost.
- Headless FPS readings (9–27) are SwiftShader software-rendering artifacts;
  headed run measured 53.7 fps with all effects on.
