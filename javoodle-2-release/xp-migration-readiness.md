# XP Migration Readiness Audit — 0010_xp_ledger_unique.sql

## Exact SQL (as written)

```sql
create unique index if not exists xp_events_lesson_once
  on public.xp_events (student_id, ref_id)
  where reason = 'lesson_completed' and ref_id is not null;

create unique index if not exists xp_events_mission_once
  on public.xp_events (student_id, ref_id)
  where reason = 'mission_completed' and ref_id is not null;

create unique index if not exists xp_events_achievement_bonus_once
  on public.xp_events (student_id, ref_id)
  where reason = 'achievement_bonus' and ref_id is not null;
```

## Insert-convention verification (all sites grepped)

| reason | ref_id source | type | repeatable? | covered? |
|---|---|---|---|---|
| lesson_completed | `lessonId` (learn.ts:44) | uuid | NO | YES |
| mission_completed | `mission.id` (missions.ts:130) | uuid | NO | YES |
| achievement_bonus | `achId` (evaluate.ts:96) | uuid | NO | YES |
| mission_attempt | `mission.id` (missions.ts:89), amount=0 | uuid | YES (rate-limit log) | correctly excluded |
| practice_correct / practice_partial | `questionId` (practice.ts:73) | uuid | YES (re-attempts legit) | correctly excluded |

All covered ref_ids are non-null uuids → predicates match insert conventions exactly. No other xp_events writers exist.

## Pre-flight audit queries (run BEFORE applying)

```sql
-- 1. Existing duplicates per covered reason (must return 0 rows each):
select student_id, ref_id, count(*)
from public.xp_events
where reason = 'lesson_completed' and ref_id is not null
group by student_id, ref_id having count(*) > 1;

select student_id, ref_id, count(*)
from public.xp_events
where reason = 'mission_completed' and ref_id is not null
group by student_id, ref_id having count(*) > 1;

select student_id, ref_id, count(*)
from public.xp_events
where reason = 'achievement_bonus' and ref_id is not null
group by student_id, ref_id having count(*) > 1;

-- 2. Row counts / sanity:
select reason, count(*) from public.xp_events group by reason;

-- 3. Index absence check (should return 0 rows):
select indexname from pg_indexes
where tablename = 'xp_events' and indexname like 'xp_events_%_once';
```

Expected: all duplicate queries → 0 rows (historical data was written under check-then-insert, so duplicates are unlikely but MUST be verified).

## Failure semantics — SAFE

`CREATE UNIQUE INDEX` **fails atomically** if duplicates exist — it does NOT delete or modify rows. Historical rewards are never touched. However:

**RISK — invalid index on retry:** if index creation fails midway (e.g., duplicates found), Postgres may leave an INVALID index. `IF NOT EXISTS` will then SKIP recreation on retry, silently leaving a non-enforcing index. Mitigation: after any failed run, check
`select indexname, indisvalid from pg_indexes i join pg_class c on c.relname=i.indexname join pg_index x on x.indexrelid=c.oid where i.tablename='xp_events';`
and `DROP INDEX` any `xp_events_*_once` with `indisvalid=false` before retrying.

## Retry safety

- `IF NOT EXISTS` makes re-runs idempotent for SUCCESSFUL indexes.
- For failed/invalid indexes, drop-then-recreate (see above).
- Non-`CONCURRENTLY` build takes a brief write lock on `xp_events` — table is small (per-student reward events), lock window is milliseconds. Acceptable; `CONCURRENTLY` cannot run inside a transaction/migration wrapper, so plain build is the correct choice here.

## Conflict-handling correctness (code side, already shipped)

- learn.ts: `23505` → treated as already-completed; other errors still fail. XP not re-incremented.
- missions.ts: `23505` → returns `alreadyCompleted:true, xpAwarded:0`. XP not re-incremented.
- evaluate.ts: `23505` on bonus insert ignored — unlock row already exists via unique `student_achievements`, so bonus is genuinely once-only.
- XP totals derive solely from `sum(amount)` over `xp_events` (growth/data.ts, stats.ts) — no separate counter to drift.

## Remaining risks

1. Duplicates may already exist in remote data → index creation fails (safe, but blocks hardening until cleaned manually — DO NOT auto-delete; investigate first).
2. `practice_*` rewards remain non-unique by design — a repeated-answer edge case could double-award practice XP; out of scope (legitimate repeats share the same shape).
3. Index not yet applied — code degrades gracefully to prior semantics.
