# Security Report

- Hidden mission test cases live in `lib/missions/tests.server.ts` marked `server-only` — verified absent from client bundle path (only `catalogue.ts`/`daily.ts` imported by client components).
- `submitMissionAction` derives `studentId` from `getStudentSession()` — never trusts client-supplied IDs.
- All Java execution via `executeJava()` → OnlineCompiler.io; no student code runs in the Next.js process. Executor key stays server-side.
- XP/completion awarded only after ALL hidden tests pass, verified server-side; idempotent via ledger check-then-insert (double-submit re-checks before insert).
- Achievement unlocks evaluated server-side only; unique DB constraint prevents duplicates; bonus XP granted once.
- Attempt rate limit (10/min) via DB-backed ledger.
- Projects derive progress solely from verified mission completions — no self-reported state.
- No new secrets, no schema changes, RLS untouched, no service-role exposure to client.
