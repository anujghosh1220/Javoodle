# Project Verification — PASS

- 4 projects load (5 cards incl. info card). Milestones → real mission slugs (unit test).
- Progress derived exclusively from verified mission xp_events — failed missions cannot inflate it; repeated completion cannot (mission idempotency upstream).
- Cross-student isolation: all queries scoped by session studentId via service role after auth.
