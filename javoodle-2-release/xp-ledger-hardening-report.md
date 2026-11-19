# XP Ledger Concurrency Hardening Report

## Schema findings
`xp_events(id, student_id, session_id?, amount, reason, ref_id?, created_at)` — no unique constraints; `ref_id` nullable.

Reward inventory (verified by grep of all insert sites):
| reason | repeatable? | site |
|---|---|---|
| lesson_completed | NO (once per lesson) | learn.ts |
| mission_completed | NO | missions.ts |
| achievement_bonus | NO (once per achievement) | evaluate.ts |
| practice_correct / practice_partial | YES — same question may be re-attempted | practice.ts |
| mission_attempt | YES — rate-limit counter | missions.ts |

Conclusion: `(student_id, reason, ref_id)` is NOT universally unique — practice/mission_attempt legitimately repeat. Narrow rule required.

## Migration
`supabase/migrations/0010_xp_ledger_unique.sql` — three PARTIAL unique indexes (once-only reasons only, `ref_id IS NOT NULL` guard). Repeatable rewards untouched. No existing rows modified; index creation is non-destructive.

## Code changes (conflict-tolerant inserts)
- `learn.ts`: xp insert error 23505 → treated as already-completed, no double award; other errors still fail.
- `missions.ts`: on all-pass, insert 23505 → returns `alreadyCompleted:true, xpAwarded:0`.
- `evaluate.ts`: achievement_bonus insert ignores 23505 (bonus already granted).
- The DB index is the atomic arbiter; check-then-insert remains as fast path. Without the index applied, behavior degrades gracefully to previous semantics.

## Application status — BLOCKED
`npx supabase link` failed: account lacks privileges for project `agbqgargwfgniivqwwqf`. Migration file is ready; must be applied via dashboard SQL editor or an authorized `supabase db push`.

## Testing
- tsc --noEmit: PASS. Vitest: 105/105 PASS. Build: unchanged paths.
- Concurrency test (two simultaneous identical submits): NOT EXECUTED — requires applied index + live DB race; code path verified by inspection (insert error → alreadyCompleted branch).
- Regression: repeatable rewards untouched; RLS/auth unchanged; 150-XP levels untouched.

## Remaining limitations
1. Index NOT yet applied to remote DB — race is mitigated in code but not fully closed until migration runs.
2. practice rewards remain non-unique by design (legitimate repeats).

---

## POST-MIGRATION VERIFICATION (executed 2026-11-19, live remote DB)

Indexes confirmed applied by user. Empirical concurrency test via service role against real `xp_events`, test student "VerifyBot" (d74fc0e3…), synthetic random ref_ids, rows deleted after each test:

| reason | insert A | insert B (simultaneous) | rows created |
|---|---|---|---|
| mission_completed | ok | **23505** | **1** |
| lesson_completed | **23505** | ok | **1** |
| achievement_bonus | **23505** | ok | **1** |
| mission_attempt (repeatable) | ok | ok | 2 (both allowed — correct) |

Evidence: exactly one row per once-only reward under true concurrent inserts; repeatable reward unaffected; all test rows cleaned up; no real student data touched.

Regression: `tsc --noEmit` clean · Vitest **105/105** · `next build` pass.
Conflict path (23505 → already-awarded response) verified in code at learn.ts, missions.ts, evaluate.ts.

**Status: concurrency race CLOSED.** Remaining note: practice_correct/practice_partial remain non-unique by design (legitimate re-attempts).
