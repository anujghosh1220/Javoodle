# Remaining Bottlenecks
1. Hydration-bound FCP (~0.8–1.3s) — would need bundle diet (framer-motion/code-splitting audit) for sub-1s; deferred, needs profiling evidence.
2. Admin routes unmeasured — likely fine (same SSR pattern) but unverified.
3. LCP/INP/CLS not measurable with current Playwright paint API — needs Lighthouse or CDP metrics for hard numbers.
4. Cold-start of prod server adds ~1–2s once (compile-free since build exists) — not representative of warm hosting.
5. OnlineCompiler execution (5–30s) is external and correctly excluded from page-load budgets.
