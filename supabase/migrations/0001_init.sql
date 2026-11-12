-- ============================================================================
-- Javoodle · 0001_init.sql
-- Full schema for the ICSE Class 10 Java learning platform.
-- Run via: supabase db push  |  supabase migration up  |  psql -f 0001_init.sql
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/** True when the caller's JWT carries app_metadata.role = 'admin'.
 *  Admin role is assigned via SQL (see docs/DATABASE.md), never by the client. */
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ---------------------------------------------------------------------------
-- Students & sessions
-- ---------------------------------------------------------------------------

create table public.students (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 2 and 40),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- One row per active device/session. token_hash = sha256(cookie token);
-- the raw token never touches the database.
create table public.student_sessions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  token_hash  text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  user_agent  text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  last_seen_at timestamptz,
  revoked_at  timestamptz
);

create index student_sessions_student_idx on public.student_sessions(student_id);
create index student_sessions_active_idx
  on public.student_sessions(expires_at)
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Syllabus & lessons
-- ---------------------------------------------------------------------------

create table public.topics (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phase        smallint not null check (phase between 1 and 3),
  parent_id    uuid references public.topics(id) on delete set null,
  order_index  int not null default 0,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint topics_name_unique unique (name)
);

create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.topics(id) on delete cascade,
  title       text not null,
  blocks      jsonb not null default '[]'::jsonb,
  order_index int not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index lessons_topic_idx on public.lessons(topic_id, order_index);

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- A student's lesson completion (drives syllabus %).
create table public.lesson_completions (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create index lesson_completions_student_idx on public.lesson_completions(student_id);

-- ---------------------------------------------------------------------------
-- Question studio
-- ---------------------------------------------------------------------------

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  filename     text not null,
  mime         text not null,
  storage_path text not null,
  kind         text not null check (kind in ('pdf','docx','image','json')),
  page_count   int,
  status       text not null default 'uploaded'
               check (status in ('uploaded','processing','processed','failed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create table public.questions (
  id                    uuid primary key default gen_random_uuid(),
  topic_id              uuid references public.topics(id) on delete set null,
  type                  text not null check (type in
                          ('mcq','fib','truefalse','output','error','theory','program')),
  text                  text not null,
  marks                 numeric(5,1) not null check (marks > 0),
  difficulty            smallint not null default 1 check (difficulty between 1 and 5),
  source_document_id    uuid references public.documents(id) on delete set null,
  source_page           int,
  source_year           smallint,
  status                text not null default 'draft'
                        check (status in ('draft','pending','approved','rejected')),
  version               int not null default 1,
  ai_metadata           jsonb not null default '{}'::jsonb,
  correct_answer_text   text,
  explanation           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index questions_topic_status_idx on public.questions(topic_id, status);
create index questions_type_idx on public.questions(type);
create index questions_status_idx on public.questions(status);

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create table public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label       text not null,
  text        text not null,
  is_correct  boolean not null default false,
  order_index int not null default 0
);

create index question_options_question_idx on public.question_options(question_id);

create table public.question_versions (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  version     int not null,
  snapshot    jsonb not null,
  created_at  timestamptz not null default now(),
  unique (question_id, version)
);

create table public.test_cases (
  id               uuid primary key default gen_random_uuid(),
  question_id      uuid not null references public.questions(id) on delete cascade,
  input            text not null default '',
  expected_output  text not null,
  is_hidden        boolean not null default true,
  order_index      int not null default 0
);

create index test_cases_question_idx on public.test_cases(question_id);

create table public.marking_rubrics (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  criteria    text not null,
  max_marks   numeric(5,1) not null check (max_marks > 0),
  keywords    jsonb not null default '[]'::jsonb
);

create index marking_rubrics_question_idx on public.marking_rubrics(question_id);

-- ---------------------------------------------------------------------------
-- Exams
-- ---------------------------------------------------------------------------

create table public.exams (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  duration_minutes int not null check (duration_minutes > 0),
  total_marks      numeric(6,1) not null check (total_marks > 0),
  status           text not null default 'draft'
                   check (status in ('draft','published','archived')),
  opens_at         timestamptz,
  closes_at        timestamptz,
  config           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

create table public.exam_sections (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references public.exams(id) on delete cascade,
  title       text not null,
  order_index int not null default 0,
  marks       numeric(6,1) not null default 0
);

create index exam_sections_exam_idx on public.exam_sections(exam_id, order_index);

create table public.exam_questions (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references public.exams(id) on delete cascade,
  section_id     uuid not null references public.exam_sections(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete restrict,
  order_index    int not null default 0,
  marks_override numeric(5,1) check (marks_override is null or marks_override > 0),
  is_compulsory  boolean not null default true,
  choice_group   int,
  unique (exam_id, question_id)
);

create index exam_questions_exam_idx on public.exam_questions(exam_id, section_id);
create index exam_questions_question_idx on public.exam_questions(question_id);

create table public.exam_attempts (
  id               uuid primary key default gen_random_uuid(),
  exam_id          uuid not null references public.exams(id) on delete restrict,
  student_id       uuid not null references public.students(id) on delete cascade,
  session_id       uuid not null references public.student_sessions(id) on delete cascade,
  started_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  status           text not null default 'in_progress'
                   check (status in ('in_progress','submitted','evaluated')),
  total_score      numeric(6,1),
  config_snapshot  jsonb not null default '{}'::jsonb
);

create index exam_attempts_exam_student_idx on public.exam_attempts(exam_id, student_id);
create index exam_attempts_student_idx on public.exam_attempts(student_id, started_at desc);

create table public.student_answers (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null references public.exam_attempts(id) on delete cascade,
  question_id      uuid not null references public.questions(id) on delete restrict,
  question_version int not null,
  answer           jsonb not null default '{}'::jsonb,
  marks_awarded    numeric(5,1),
  evaluation       jsonb,
  answered_at      timestamptz not null default now(),
  flagged          boolean not null default false,
  unique (attempt_id, question_id)
);

create index student_answers_attempt_idx on public.student_answers(attempt_id);

-- ---------------------------------------------------------------------------
-- Practice & gamification
-- ---------------------------------------------------------------------------

create table public.practice_history (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.students(id) on delete cascade,
  session_id       uuid not null references public.student_sessions(id) on delete cascade,
  question_id      uuid references public.questions(id) on delete set null,
  question_version int,
  mode             text not null check (mode in ('practice','playground','exam')),
  answer           jsonb not null default '{}'::jsonb,
  marks_awarded    numeric(5,1),
  correct          boolean,
  xp               int not null default 0,
  created_at       timestamptz not null default now()
);

create index practice_history_student_idx
  on public.practice_history(student_id, created_at desc);

create table public.xp_events (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  session_id  uuid references public.student_sessions(id) on delete set null,
  amount      int not null,
  reason      text not null,
  ref_id      uuid,
  created_at  timestamptz not null default now()
);

create index xp_events_student_idx on public.xp_events(student_id);

create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  title       text not null,
  description text not null,
  icon        text,
  criteria    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table public.student_achievements (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  progress       jsonb not null default '{}'::jsonb,
  unique (student_id, achievement_id)
);

create index student_achievements_student_idx on public.student_achievements(student_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Model:
--   * Private student data (students, sessions, attempts, answers, history,
--     xp, achievements earned): NO anon/authenticated access at all.
--     Reads for the student app go through server routes that validate the
--     session token and use the service role. Admin reads use is_admin().
--   * Catalog content (topics, published lessons, approved questions,
--     published exams): readable by anon/authenticated with status filters.
--   * All writes to content: is_admin() only.
-- ============================================================================

alter table public.students              enable row level security;
alter table public.student_sessions      enable row level security;
alter table public.topics                enable row level security;
alter table public.lessons               enable row level security;
alter table public.lesson_completions    enable row level security;
alter table public.documents             enable row level security;
alter table public.questions             enable row level security;
alter table public.question_options      enable row level security;
alter table public.question_versions     enable row level security;
alter table public.test_cases            enable row level security;
alter table public.marking_rubrics       enable row level security;
alter table public.exams                 enable row level security;
alter table public.exam_sections         enable row level security;
alter table public.exam_questions        enable row level security;
alter table public.exam_attempts         enable row level security;
alter table public.student_answers       enable row level security;
alter table public.practice_history      enable row level security;
alter table public.xp_events             enable row level security;
alter table public.achievements          enable row level security;
alter table public.student_achievements  enable row level security;

-- ---------------------------------------------------------------------------
-- Private student tables — admin read-only; all writes via service role.
-- ---------------------------------------------------------------------------

create policy students_admin_select on public.students
  for select to authenticated using (public.is_admin());

create policy student_sessions_admin_select on public.student_sessions
  for select to authenticated using (public.is_admin());

create policy lesson_completions_admin_select on public.lesson_completions
  for select to authenticated using (public.is_admin());

create policy exam_attempts_admin_all on public.exam_attempts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy student_answers_admin_all on public.student_answers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy practice_history_admin_all on public.practice_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy xp_events_admin_all on public.xp_events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy student_achievements_admin_all on public.student_achievements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Catalog content — public reads (filtered), admin writes.
-- ---------------------------------------------------------------------------

create policy topics_read on public.topics
  for select to anon, authenticated using (true);
create policy topics_admin_write on public.topics
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy lessons_public_read on public.lessons
  for select to anon, authenticated using (published = true);
create policy lessons_admin_all on public.lessons
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy documents_admin_all on public.documents
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy questions_public_read on public.questions
  for select to anon, authenticated using (status = 'approved');
create policy questions_admin_all on public.questions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy question_options_public_read on public.question_options
  for select to anon, authenticated using (
    exists (select 1 from public.questions q
            where q.id = question_id and q.status = 'approved')
  );
create policy question_options_admin_all on public.question_options
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Version snapshots are internal — admin only.
create policy question_versions_admin_all on public.question_versions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Hidden test cases and marking rubrics are never exposed to students.
create policy test_cases_public_read on public.test_cases
  for select to anon, authenticated using (
    is_hidden = false
    and exists (select 1 from public.questions q
                where q.id = question_id and q.status = 'approved')
  );
create policy test_cases_admin_all on public.test_cases
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy marking_rubrics_admin_all on public.marking_rubrics
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy exams_public_read on public.exams
  for select to anon, authenticated using (status = 'published');
create policy exams_admin_all on public.exams
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy exam_sections_public_read on public.exam_sections
  for select to anon, authenticated using (
    exists (select 1 from public.exams e
            where e.id = exam_id and e.status = 'published')
  );
create policy exam_sections_admin_all on public.exam_sections
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy exam_questions_public_read on public.exam_questions
  for select to anon, authenticated using (
    exists (select 1 from public.exams e
            where e.id = exam_id and e.status = 'published')
  );
create policy exam_questions_admin_all on public.exam_questions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy achievements_read on public.achievements
  for select to anon, authenticated using (true);
create policy achievements_admin_all on public.achievements
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Grants (Supabase default grants cover these, stated for clarity)
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;

-- Public catalog reads. NOTE: answer-bearing columns are deliberately
-- excluded — correct_answer_text, explanation, ai_metadata and
-- question_options.is_correct are only reachable via the service role
-- (server-side evaluation) or an admin context. RLS alone cannot hide
-- columns, so this is enforced at the grant level.
grant select on public.topics, public.lessons, public.test_cases,
  public.exams, public.exam_sections, public.exam_questions,
  public.achievements
  to anon, authenticated;

-- Supabase cloud auto-grants table-level SELECT on new public tables to
-- anon/authenticated (auto_expose_new_tables). Column privileges cannot
-- subtract from a table-level grant, so the table-level SELECT on the two
-- answer-bearing tables must be revoked before column grants apply.
revoke select on public.questions from anon, authenticated;
revoke select on public.question_options from anon, authenticated;

grant select (
  id, topic_id, type, text, marks, difficulty,
  source_document_id, source_page, source_year,
  status, version, created_at, updated_at
) on public.questions to anon, authenticated;

grant select (
  id, question_id, label, text, order_index
) on public.question_options to anon, authenticated;
-- Write grants for content management. RLS (is_admin()) decides who may
-- actually write; the column-limited SELECT above still applies, so even
-- an authenticated admin reads answer columns via the service role.
grant insert, update, delete on public.topics, public.lessons,
  public.documents, public.questions, public.question_options,
  public.question_versions, public.test_cases, public.marking_rubrics,
  public.exams, public.exam_sections, public.exam_questions,
  public.achievements
  to authenticated;
grant select on public.students, public.student_sessions,
  public.lesson_completions, public.exam_attempts, public.student_answers,
  public.practice_history, public.xp_events, public.student_achievements
  to authenticated;
grant select, insert, update, delete on public.students,
  public.student_sessions, public.lesson_completions, public.exam_attempts,
  public.student_answers, public.practice_history, public.xp_events,
  public.student_achievements
  to service_role;
