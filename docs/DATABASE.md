# Javoodle — Database Schema

**Status: IMPLEMENTED** in `supabase/migrations/0001_init.sql`.
Seed data (syllabus topics) in `supabase/seed.sql`.
RLS verification script: `supabase/tests/rls_checks.sql`.

## Setup instructions

1. Create a free Supabase project → Project Settings → API.
2. Copy into `.env.local` (see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret — server only)
3. Apply the migration, either:
   - Supabase CLI: `supabase link --project-ref <ref>` then
     `supabase db push` (uses `supabase/migrations/`), or
   - SQL Editor: paste `0001_init.sql`, run; then paste `seed.sql`, run.
4. Create the admin user (Authentication → Users → Add user, or sign up
   once then confirm email). Then grant the admin role:

   ```sql
   update auth.users
   set raw_app_meta_data =
     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'you@example.com';
   ```

   The role lands in the JWT `app_metadata` — sign out/in (or wait for token
   refresh) before `/admin` accepts the session.
5. Verify RLS: run `supabase/tests/rls_checks.sql` in the SQL Editor —
   it raises on any policy violation; clean exit = pass.

## Students & sessions

- `students(id, display_name, created_at, updated_at)` — one row per learner.
  v1: a name match (case-insensitive) reuses the existing row so a single
  student's progress follows her across devices/sessions.
- `student_sessions(id, student_id→students, token_hash UNIQUE, user_agent,
  created_at, expires_at, last_seen_at, revoked_at)`
  - `token_hash` = SHA-256 hex of the cookie token (`lib/student/token.ts`).
    The raw `jds_…` token never touches the DB.
  - Active = `revoked_at IS NULL AND expires_at > now()`.

## Content

- `topics(id, name, phase 1-3, parent_id→topics, order_index, description)`
- `lessons(id, topic_id→topics, title, blocks jsonb, order_index, published)`
  - `blocks`: typed content array — text / code / output / note / practice.
- `lesson_completions(student_id, lesson_id, completed_at)` — added in
  implementation to drive syllabus-% on the dashboard.
- `documents(id, filename, mime, storage_path, kind pdf|docx|image|json,
  page_count, status)` — source files live in Supabase Storage.

## Question studio

- `questions(id, topic_id, type mcq|fib|truefalse|output|error|theory|program,
  text, marks, difficulty 1-5, source_document_id, source_page, source_year,
  status draft|pending|approved|rejected, version, ai_metadata jsonb,
  correct_answer_text, explanation)`
- `question_options(question_id, label, text, is_correct, order_index)`
- `question_versions(question_id, version, snapshot jsonb)` — UNIQUE
  (question_id, version); frozen copies so exam attempts never change.
- `test_cases(question_id, input, expected_output, is_hidden, order_index)`
- `marking_rubrics(question_id, criteria, max_marks, keywords jsonb)`

## Exams & attempts

- `exams(id, title, duration_minutes, total_marks, status
  draft|published|archived, opens_at, closes_at, config jsonb)`
- `exam_sections(exam_id, title, order_index, marks)`
- `exam_questions(exam_id, section_id, question_id, order_index,
  marks_override, is_compulsory, choice_group)` — UNIQUE (exam_id, question_id)
- `exam_attempts(exam_id, student_id, session_id, started_at, submitted_at,
  status in_progress|submitted|evaluated, total_score, config_snapshot)`
- `student_answers(attempt_id, question_id, question_version, answer jsonb,
  marks_awarded, evaluation jsonb, answered_at, flagged)` —
  UNIQUE (attempt_id, question_id)

## Practice & gamification

- `practice_history(student_id, session_id, question_id, question_version,
  mode practice|playground|exam, answer jsonb, marks_awarded, correct, xp)`
- `xp_events(student_id, session_id, amount, reason, ref_id)` — append-only
  ledger; level = derived from sum(amount).
- `achievements(code UNIQUE, title, description, icon, criteria jsonb)`
- `student_achievements(student_id, achievement_id, unlocked_at, progress)`
  — keyed by `student_id` (not session) so badges survive re-login.

## RLS model (as implemented)

- **Private student tables** — no anon/authenticated student access.
  Admin `SELECT` via `is_admin()`; all student writes via service role
  after server-side session-token validation. Ownership (`student_id`) is
  derived server-side, never from client input.
- **Catalog content** — anon/authenticated `SELECT` filtered to
  `published`/`approved`; all writes require `is_admin()`.
- `is_admin()` = `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`.
- Hidden `test_cases` and `marking_rubrics` are admin-only even for approved
  questions.
- `service_role` bypasses RLS — it is the only path for student data writes.

## Indexes

Hot paths covered: session lookup by `token_hash` (unique), sessions by
`student_id` + active-expiry partial index, questions by
`(topic_id, status)` / `type` / `status`, exam questions by
`(exam_id, section_id)` and `question_id`, answers by `attempt_id`,
history/xp/attempts by `student_id` (+ `created_at desc`), completions by
`student_id`, unique constraints on `(question_id, version)` snapshots,
`(attempt_id, question_id)` answers, `(student_id, lesson_id)` completions,
`(student_id, achievement_id)` badges, `achievements.code`.
