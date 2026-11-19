# Performance Audit — Javoodle

## Method
Production build (`npm start`, port 3001), Playwright Chromium 1440×900, authenticated test student (PerfBot), real Supabase + OnlineCompiler config. Metrics from Navigation/Resource timing + paint entries. Evidence: `route-performance-before.json`, `measure.mjs`.

## Headline finding
**Server-side latency is NOT the bottleneck.** TTFB = 3–10ms on every student route (warm SSR). Supabase queries execute in parallel already in the hot paths (dashboard, growth). FCP = 750–1330ms — dominated by client JS download + hydration, not data fetching. LCP entries unavailable via this Playwright/paint API (reported null honestly).

## Route timings (warm load, ms)
| route | TTFB | FCP | load | reqs | transfer |
|---|---|---|---|---|---|
| landing | 8 | 148 | 66 | 23 | 13KB |
| dashboard | 8 | 1180 | 1248 | 35 | 30KB |
| learn | 7 | 812 | 684 | 38 | 31KB |
| practice | 5 | 756 | 1152 | 39 | 32KB |
| missions | 5 | 1100 | 967 | 38 | 31KB |
| coding | 5 | 928 | 809 | 38 | 31KB |
| playground | 8 | 852 | 722 | 40 | 69KB |
| visualizer | 5 | 828 | 675 | 33 | 26KB |
| projects | 4 | 1056 | 922 | 38 | 31KB |
| growth | 5 | 1100 | 957 | 33 | 26KB |
| exams | 5 | 924 | 815 | 33 | 26KB |

Cold vs warm: negligible difference (TTFB already ~5ms; data is SSR'd per request, no build-time prerender for authed pages — expected and correct for personalized data).

## Bottleneck analysis
1. **Hydration/JS bundle** — FCP ~0.8–1.3s with only ~30KB transferred → cost is JS parse/execute, not network. framer-motion + app code is the main weight. Monaco already `next/dynamic ssr:false`.
2. **Sequential awaits** — `/missions` ran completion-set then XP-sum serially → fixed (parallel).
3. **Admin routes** — NOT MEASURED (no credentials); code inspection shows list pages use bounded selects but directory loads all students — flagged, not changed without evidence.
4. **Atmosphere** — single canvas/rAF already; pauses on hidden tab; DPR capped. No change needed.
