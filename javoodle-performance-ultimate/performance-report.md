# Sub-1s Performance Report — Javoodle

## Baseline (pre-optimization, prod build, warm)
TTFB 3–10ms all routes; FCP 750–1330ms; hydration-bound. Evidence: javoodle-performance-release/route-performance-before.json.

## Changes made (evidence-backed only)
1. `next.config.ts`: `experimental.optimizePackageImports: ["lucide-react"]` — barrel-import tree-shaking.
2. `AchievementConstellation` + `LearningGalaxy`: `next/dynamic` code-split (below-fold, keeps SSR).
3. `RobotCompanion` (880 lines, framer-motion mascot): lazy-loaded post-hydration via `LazyRobotCompanion` client wrapper (`ssr:false`) — was hydrating on EVERY student route.
4. (Prior session) `/missions` parallel fetch; Wordmark/experience components already code-split by route.

## After (prod build, warm FCP ms)
| route | before | after |
|---|---|---|
| dashboard | 1148–1444 | 828 |
| learn | 812–1836 | 1040 |
| practice | 756–1176 | 816 |
| missions | 1080–1196 | 812 |
| coding | 696–1332 | 788 |
| playground | 840–944 | 844 |
| visualizer | 784–1204 | 776 |
| projects | 792–1056 | 848 |
| growth | 760–1616 | 760 |
| exams | 772–1012 | 772 |
| landing warm | 148–264 | 160 |

TTB still 4–11ms; CLS ~0; zero console errors; single canvas preserved.

## Verdict
Warm FCP now 760–1040ms on all student routes — the ~1s meaningful-content target is MET or within noise on localhost prod build. Cold loads 0.8–1.2s FCP (one-time JS parse). Playground cold transfer 881KB = Monaco (already route-scoped, loads on demand).

## NOT achieved / honest limits
- Live deployment URL not found in repo — measurements are localhost prod build, NOT the real deployment. Infrastructure factors (cold starts, geography, CDN caching) untested.
- LCP/INP not measurable with current tooling (paint API returns null).
- learn/growth remain ~1.0s — constellation/galaxy chunks still hydrate (ssr:true required in RSC).
- p50/p75: single-run samples per route; variance ±300ms observed across runs.
- Admin interior untested (no creds).
