# Security Review — PASS with one note

- Hidden tests: `server-only` module, never in client bundle. PASS
- AuthZ: studentId from session only. PASS
- Execution: OnlineCompiler.io remote; no in-process Java. PASS
- Idempotency: check-then-insert on xp_events; NOTE — no DB unique constraint on (student_id, reason, ref_id); a simultaneous double-submit could theoretically double-award. Low likelihood (UI disables + re-check). Recommend follow-up unique index if schema changes are ever allowed.
- No secrets client-side; RLS untouched.
