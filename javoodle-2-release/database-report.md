# Database Report

**No new migrations.** All persistence reuses verified existing tables:

| Need | Table reused | Notes |
|---|---|---|
| Mission completion + XP | `xp_events` (`reason='mission_completed'`, `ref_id=mission uuid`) | idempotent check-then-insert, same convention as lessons |
| Mission attempt rate limit | `xp_events` (`reason='mission_attempt'`, amount=0) | 10/min cap |
| Achievement unlocks | `student_achievements` (pre-existing, unique student+achievement) | upsert `ignoreDuplicates` |
| Achievement definitions | `achievements` (pre-existing, `code` unique) | runtime upsert by code |
| Achievement bonus XP | `xp_events` (`reason='achievement_bonus'`) | once per unlock |
| Stats for evaluation | `xp_events`, `lesson_completions`, `coding_execution_runs`, `exam_attempts` | read-only |
| Project progress | derived from mission `xp_events` | no storage needed |

RLS unchanged — all writes go through `createAdminClient()` after `getStudentSession()` auth.
