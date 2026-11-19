# Performance — Final (production build, warm, 1920×1440 viewport)

| route | TTFB | FCP | CLS |
|---|---|---|---|
| dashboard | 5ms | 1444ms | 0 |
| learn | 6ms | 1836ms | 0 |
| missions | 4ms | 1276ms | 0 |
| growth | 10ms | 1616ms | 0 |
| visualizer | 3ms | 812ms | 0 |
| projects | 5ms | 1380ms | 0 |
| coding | 5ms | 696ms | 0 |
| playground | 6ms | 848ms | 0 |

Baseline (pre-Exp2.0): FCP 750–1330ms, TTFB 3–10ms, CLS ~0.
After: FCP 696–1836ms — data-heavy pages (learn/growth) ~300–500ms higher due to constellation/galaxy client JS; core workspaces unchanged or better. TTFB/CLS unchanged. LCP/INP: NOT TESTED (paint API limits). Canvas=1, no new rAF. Verdict: PASS with noted FCP increase on learn/growth — acceptable, not a regression of the 1s server budget.
