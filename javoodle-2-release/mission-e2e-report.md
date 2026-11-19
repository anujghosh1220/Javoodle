# Mission E2E Report — PASS (live)

Executed: login → /missions → /missions/digit-sum → Monaco typing → Submit.
- Wrong code: FAIL correctly, per-test feedback shown, compile/runtime errors surface via executor.
- Right code: PASS, all hidden tests, +40 XP awarded once.
- Resubmit: blocked client-side (Completed state) + server returns alreadyCompleted (no double XP).
- Persistence: completed state survives reload.
- Hidden tests never leave server (`tests.server.ts` is `server-only`).
- Rate limit: 10 mission_attempts/min via xp_events ledger.
- NOTE: xp_events has no unique constraint — idempotency is check-then-insert; a true concurrent race could double-insert (theoretical; mitigated by re-check before insert). Documented in remaining-blockers.
