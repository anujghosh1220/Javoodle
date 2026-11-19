-- XP ledger concurrency hardening.
-- Once-only rewards get partial unique indexes; repeatable rewards
-- (practice_correct, practice_partial, mission_attempt) are untouched.
-- ref_id is nullable, so each index requires ref_id IS NOT NULL.

create unique index if not exists xp_events_lesson_once
  on public.xp_events (student_id, ref_id)
  where reason = 'lesson_completed' and ref_id is not null;

create unique index if not exists xp_events_mission_once
  on public.xp_events (student_id, ref_id)
  where reason = 'mission_completed' and ref_id is not null;

create unique index if not exists xp_events_achievement_bonus_once
  on public.xp_events (student_id, ref_id)
  where reason = 'achievement_bonus' and ref_id is not null;
