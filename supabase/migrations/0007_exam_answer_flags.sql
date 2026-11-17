-- Mark-for-review support on exam answers (additive, safe).
alter table public.exam_answers
  add column if not exists flagged boolean not null default false;
