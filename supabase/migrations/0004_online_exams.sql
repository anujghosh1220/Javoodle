-- ============================================================================
-- Javoodle · 0004_online_exams.sql
-- Phase 4: Online examination engine — exam papers, manual question
-- structure, student attempts with frozen snapshots, autosaved answers,
-- manual evaluation and result publication.
-- Additive/compatible with 0001–0003. Safe for existing data.
--
-- Design notes:
--   * exams / exam_sections are reused and extended (subject, class,
--     description, instructions, paper PDF reference, reading time,
--     passing marks, model-answer release flag).
--   * exam_paper_questions holds the admin-defined answerable structure
--     (one row = one markable question/sub-question). It is intentionally
--     separate from the Question Studio bank so exam authoring never
--     depends on approved bank questions.
--   * exam_attempts gains a frozen exam_snapshot (sections + questions +
--     marks) written when the attempt starts, so later admin edits can
--     never change an in-progress or historical attempt.
--   * exam_answers / exam_evaluations are private student data: NO
--     anon/authenticated grants at all — every read/write goes through
--     server code that has already validated the student session token
--     or the admin role (service role).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- exams: extend metadata (all additive, nullable or defaulted)
-- ---------------------------------------------------------------------------

alter table public.exams
  add column if not exists subject text not null default 'Computer Applications',
  add column if not exists class_name text not null default 'ICSE Class 10',
  add column if not exists description text,
  add column if not exists instructions text,
  add column if not exists paper_document_id uuid references public.documents(id) on delete set null,
  add column if not exists reading_time_minutes int not null default 0
    check (reading_time_minutes >= 0),
  add column if not exists passing_marks numeric(6,1) check (passing_marks is null or passing_marks >= 0),
  add column if not exists release_model_answers boolean not null default false;

-- ---------------------------------------------------------------------------
-- exam_paper_questions: admin-defined markable structure for an exam
-- ---------------------------------------------------------------------------

create table if not exists public.exam_paper_questions (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references public.exams(id) on delete cascade,
  section_id     uuid references public.exam_sections(id) on delete set null,
  question_number text not null,
  prompt         text not null,
  question_type  text not null default 'theory'
                 check (question_type in ('theory','program','output','mcq','short_answer','other')),
  marks          numeric(5,1) not null check (marks > 0),
  options        jsonb not null default '[]'::jsonb,   -- mcq: [{label,text}]
  model_answer   text,                                  -- admin-only unless released
  order_index    int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists exam_paper_questions_exam_idx
  on public.exam_paper_questions(exam_id, order_index);
create index if not exists exam_paper_questions_section_idx
  on public.exam_paper_questions(section_id);

drop trigger if exists exam_paper_questions_set_updated_at on public.exam_paper_questions;
create trigger exam_paper_questions_set_updated_at
  before update on public.exam_paper_questions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exam_attempts: extend for timed attempts, snapshots and evaluation flow
-- ---------------------------------------------------------------------------

alter table public.exam_attempts
  add column if not exists deadline_at timestamptz,
  add column if not exists exam_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists total_marks_snapshot numeric(6,1),
  add column if not exists passing_marks_snapshot numeric(6,1),
  add column if not exists duration_minutes_snapshot int,
  add column if not exists reading_time_minutes_snapshot int,
  add column if not exists percentage numeric(6,2),
  add column if not exists evaluated_at timestamptz,
  add column if not exists published_at timestamptz;

-- Wider lifecycle: in_progress → submitted → under_evaluation →
-- evaluation_completed → result_published. 'evaluated' kept for
-- compatibility with any rows written by earlier phases.
alter table public.exam_attempts drop constraint if exists exam_attempts_status_check;
alter table public.exam_attempts
  add constraint exam_attempts_status_check
  check (status in (
    'in_progress','submitted','under_evaluation',
    'evaluation_completed','result_published','evaluated'
  ));

-- One attempt per student per exam. Prevents duplicate attempts and makes
-- resume-after-refresh unambiguous. Retakes are out of scope for Phase 4.
create unique index if not exists exam_attempts_exam_student_unique
  on public.exam_attempts(exam_id, student_id);

create index if not exists exam_attempts_status_idx on public.exam_attempts(status);

-- ---------------------------------------------------------------------------
-- exam_answers: autosaved student answers (private)
-- ---------------------------------------------------------------------------

create table if not exists public.exam_answers (
  id                uuid primary key default gen_random_uuid(),
  attempt_id        uuid not null references public.exam_attempts(id) on delete cascade,
  paper_question_id uuid not null references public.exam_paper_questions(id) on delete restrict,
  answer_text       text not null default '',
  mcq_option        text,
  saved_at          timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (attempt_id, paper_question_id)
);

create index if not exists exam_answers_attempt_idx on public.exam_answers(attempt_id);

drop trigger if exists exam_answers_set_updated_at on public.exam_answers;
create trigger exam_answers_set_updated_at
  before update on public.exam_answers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exam_evaluations: manual question-by-question marks (private until published)
-- ---------------------------------------------------------------------------

create table if not exists public.exam_evaluations (
  id                uuid primary key default gen_random_uuid(),
  attempt_id        uuid not null references public.exam_attempts(id) on delete cascade,
  paper_question_id uuid not null references public.exam_paper_questions(id) on delete restrict,
  marks_awarded     numeric(5,1) not null default 0 check (marks_awarded >= 0),
  feedback          text,
  evaluated_by      uuid references auth.users(id) on delete set null,
  evaluated_at      timestamptz not null default now(),
  unique (attempt_id, paper_question_id)
);

create index if not exists exam_evaluations_attempt_idx on public.exam_evaluations(attempt_id);

drop trigger if exists exam_evaluations_set_updated_at on public.exam_evaluations;
create trigger exam_evaluations_set_updated_at
  before update on public.exam_evaluations
  for each row execute function public.set_updated_at();

-- Backfill deadline for any pre-existing in-progress attempts (none expected
-- in practice; harmless if the table is empty).
update public.exam_attempts
set deadline_at = started_at + make_interval(mins => coalesce(duration_minutes_snapshot, 120))
where deadline_at is null and status = 'in_progress';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Model: exam papers and structure are admin-managed; students reach them
-- exclusively through server code using the service role after validating
-- their session token. No anon/authenticated policies are created for the
-- new private tables, and table-level grants are revoked below.
-- ---------------------------------------------------------------------------

alter table public.exam_paper_questions enable row level security;
alter table public.exam_answers          enable row level security;
alter table public.exam_evaluations      enable row level security;

-- exam_paper_questions: admin full access via RLS (defense in depth; the
-- authenticated role also has no table grant — see below).
drop policy if exists exam_paper_questions_admin_all on public.exam_paper_questions;
create policy exam_paper_questions_admin_all on public.exam_paper_questions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists exam_answers_admin_all on public.exam_answers;
create policy exam_answers_admin_all on public.exam_answers
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists exam_evaluations_admin_all on public.exam_evaluations;
create policy exam_evaluations_admin_all on public.exam_evaluations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- exam_sections/exam_questions from 0001 keep their existing policies;
-- exam_sections is reused for paper grouping (admin writes already allowed).

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Supabase auto-exposes new public tables to anon/authenticated — revoke
-- explicitly. Students and admins both go through the service role, which
-- bypasses RLS after server-side authorization.

revoke all on public.exam_paper_questions from anon, authenticated;
revoke all on public.exam_answers          from anon, authenticated;
revoke all on public.exam_evaluations      from anon, authenticated;

grant all on public.exam_paper_questions to service_role;
grant all on public.exam_answers          to service_role;
grant all on public.exam_evaluations      to service_role;

-- exams gained new columns; existing table-level grants already cover them.
grant all on all tables in schema public to service_role;
