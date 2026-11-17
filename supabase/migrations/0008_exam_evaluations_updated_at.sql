-- exam_evaluations had a set_updated_at trigger but no updated_at column,
-- so any UPDATE (including upsert-on-conflict) failed with
-- 'record "new" has no field "updated_at"'. Additive fix only.
alter table public.exam_evaluations
  add column if not exists updated_at timestamptz not null default now();
