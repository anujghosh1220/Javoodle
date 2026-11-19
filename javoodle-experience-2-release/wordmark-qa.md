# Wordmark Real-Browser QA

## Browser observations (Playwright, prod build :3001)
- Decode frames captured live: `J>=7X*7*` → `JA>*7\X#` → … → `JAVOODLE` — progressive left→right, exact final text. PASS
- Post-decode: `is-decoded` class, `wordmark-flow` 5s animation, `background-clip:text`, aria-label="JAVOODLE". PASS
- Gradient confirmed moving: backgroundPosition sampled 10s apart changed (152.53%→154.71%). PASS
- Reduced motion: text="JAVOODLE", decoded=true, animationName="none". PASS
- Widths 1280/1920: no horizontal overflow. PASS
- Console: zero errors/warnings/hydration issues. PASS

## Defect found & fixed
Navigation replay: after client nav to /missions a wordmark showed mid-decode (`JAVOO?^0`) — component remount reset the played ref. Fix: module-level `decodePlayed` flag (SSR-safe boolean) + rAF-gated setState; verified lint/tsc/build clean, 106/106 tests.

## Not verified
AdminNav live render (no admin creds) — markup identical swap, compiled. Actual audio N/A. Screenshots in screenshots/wordmark-*.png (pixel review pending human).
