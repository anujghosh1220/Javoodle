-- 0005_optional_question_groups.sql
-- Phase 4b: optional / attempt-any-N question groups + student selections.
--
-- Additive only. Extends the Phase 4 exam engine so papers like
-- "Section B: attempt any 4 of 6 questions (15 marks each)" can be
-- represented: available marks (sum of all questions) can exceed the
-- achievable total (compulsory + capped optional marks).
--
-- Security model unchanged: new tables have RLS enabled, an admin-only
-- policy for the authenticated role, and NO anon/authenticated table
-- grants — all app access goes through the service role after
-- requireAdmin() or student-session validation.

begin;

-- ---------------------------------------------------------------------------
-- Optional question groups ("attempt any N", max counted marks)
-- ---------------------------------------------------------------------------
create table if not exists public.exam_optional_groups (
  id                 uuid primary key default gen_random_uuid(),
  exam_id            uuid not null references public.exams(id) on delete cascade,
  title              text not null,
  pick_count         integer not null check (pick_count > 0),
  max_counted_marks  numeric not null check (max_counted_marks > 0),
  order_index        integer not null default 0,
  created_at         timestamptz not null default now()
);

create index if not exists exam_optional_groups_exam_idx
  on public.exam_optional_groups(exam_id, order_index);

-- Questions may belong to at most one optional group.
alter table public.exam_paper_questions
  add column if not exists optional_group_id uuid
    references public.exam_optional_groups(id) on delete set null;

create index if not exists exam_paper_questions_group_idx
  on public.exam_paper_questions(optional_group_id)
  where optional_group_id is not null;

-- ---------------------------------------------------------------------------
-- Student selections: which optional questions this attempt counts.
-- Written once at attempt start (inside startExamAction); immutable
-- afterwards because answers/evaluation only honour these rows.
-- ---------------------------------------------------------------------------
create table if not exists public.exam_attempt_question_selections (
  attempt_id         uuid not null references public.exam_attempts(id) on delete cascade,
  paper_question_id  uuid not null references public.exam_paper_questions(id) on delete cascade,
  selected_at        timestamptz not null default now(),
  primary key (attempt_id, paper_question_id)
);

create index if not exists exam_attempt_selections_attempt_idx
  on public.exam_attempt_question_selections(attempt_id);

-- ---------------------------------------------------------------------------
-- RLS + grants (mirrors 0004)
-- ---------------------------------------------------------------------------
alter table public.exam_optional_groups             enable row level security;
alter table public.exam_attempt_question_selections enable row level security;

drop policy if exists exam_optional_groups_admin_all on public.exam_optional_groups;
create policy exam_optional_groups_admin_all on public.exam_optional_groups
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists exam_attempt_selections_admin_all on public.exam_attempt_question_selections;
create policy exam_attempt_selections_admin_all on public.exam_attempt_question_selections
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.exam_optional_groups             from anon, authenticated;
revoke all on public.exam_attempt_question_selections from anon, authenticated;

grant all on public.exam_optional_groups             to service_role;
grant all on public.exam_attempt_question_selections to service_role;

commit;
