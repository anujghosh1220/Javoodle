# Security/Regression
- Events carry no sensitive data; emitted only post-server-verification.
- Constellation reads student_achievements scoped by session studentId via service role.
- Streak/galaxy read-only aggregates; no new writes, no RLS changes, no client-trusted values.
- LevelUpOverlay uses sessionStorage ONLY as a UI hint — XP/level authority remains xp_events.
- Hidden mission tests still server-only; execution events fire after real executor response.
