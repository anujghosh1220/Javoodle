-- 0006_coding_lab.sql
-- Coding Lab: admin-authored Java questions, hidden test cases, student
-- submissions and execution runs. Additive only; mirrors 0004/0005 security:
-- RLS enabled, admin-only authenticated policy, NO anon/authenticated table
-- grants — all app access via service role after requireAdmin() or
-- student-session validation.

begin;

create table if not exists public.coding_questions (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text not null default '',
  problem_statement text not null default '',
  input_format      text not null default '',
  output_format     text not null default '',
  constraints       text not null default '',
  hints             text not null default '',
  starter_code      text not null default '',
  marks             numeric not null default 5 check (marks > 0),
  difficulty        text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  topic             text not null default '',
  time_recommendation_minutes integer,
  status            text not null default 'draft' check (status in ('draft','published','archived')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.coding_question_test_cases (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.coding_questions(id) on delete cascade,
  kind         text not null default 'sample' check (kind in ('sample','hidden')),
  input_data   text not null default '',
  expected_output text not null default '',
  weight       numeric not null default 1 check (weight > 0),
  order_index  integer not null default 0
);
create index if not exists coding_test_cases_question_idx
  on public.coding_question_test_cases(question_id, kind, order_index);

create table if not exists public.coding_submissions (
  id                  uuid primary key default gen_random_uuid(),
  question_id         uuid not null references public.coding_questions(id) on delete cascade,
  student_id          uuid not null references public.students(id) on delete cascade,
  source_code         text not null,
  last_output         text,
  last_status         text,
  execution_meta      jsonb,
  attempt_number      integer not null default 1,
  review_status       text not null default 'pending'
                        check (review_status in ('pending','reviewed','resubmit_requested')),
  marks_awarded       numeric check (marks_awarded is null or marks_awarded >= 0),
  feedback            text,
  reviewed_by         uuid references auth.users(id),
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists coding_submissions_question_idx on public.coding_submissions(question_id);
create index if not exists coding_submissions_student_idx on public.coding_submissions(student_id);

create table if not exists public.coding_execution_runs (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references public.coding_questions(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  source_hash   text not null,
  status        text not null,
  stdout        text,
  stderr        text,
  compile_error text,
  runtime_error text,
  execution_time_ms integer,
  meta          jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists coding_runs_student_q_idx
  on public.coding_execution_runs(student_id, question_id, created_at desc);

alter table public.coding_questions             enable row level security;
alter table public.coding_question_test_cases   enable row level security;
alter table public.coding_submissions           enable row level security;
alter table public.coding_execution_runs        enable row level security;

drop policy if exists coding_questions_admin_all on public.coding_questions;
create policy coding_questions_admin_all on public.coding_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists coding_test_cases_admin_all on public.coding_question_test_cases;
create policy coding_test_cases_admin_all on public.coding_question_test_cases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists coding_submissions_admin_all on public.coding_submissions;
create policy coding_submissions_admin_all on public.coding_submissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists coding_runs_admin_all on public.coding_execution_runs;
create policy coding_runs_admin_all on public.coding_execution_runs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.coding_questions           from anon, authenticated;
revoke all on public.coding_question_test_cases from anon, authenticated;
revoke all on public.coding_submissions         from anon, authenticated;
revoke all on public.coding_execution_runs      from anon, authenticated;

grant all on public.coding_questions           to service_role;
grant all on public.coding_question_test_cases to service_role;
grant all on public.coding_submissions         to service_role;
grant all on public.coding_execution_runs      to service_role;

commit;
