-- ============================================================================
-- Javoodle · RLS verification script
-- Run in the Supabase SQL Editor (or psql) as postgres AFTER 0001_init.sql,
-- 0002_answer_column_privileges.sql and seed.sql.
--
-- Simulates anon / authenticated-non-admin / authenticated-admin /
-- service_role by switching ROLE + the request.jwt.claims GUC that
-- auth.jwt() reads. Session-level SET is used (NOT begin/rollback) because
-- the SQL Editor may wrap the whole script in one implicit transaction —
-- an explicit ROLLBACK would erase the fixtures.
--
-- EXPECTED RESULT: script completes with NO errors. Any "RLS FAIL" exception
-- means a policy/grant is wrong. "permission denied" inside EXPECTED-FAILURE
-- blocks is normal — it is caught by the surrounding DO block.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Fixtures (persist until the cleanup section at the bottom)
-- ---------------------------------------------------------------------------
insert into public.students (display_name) values ('__rls_test__');

insert into public.questions (type, text, marks, status) values
  ('mcq', '__rls_approved__', 1, 'approved'),
  ('mcq', '__rls_draft__',    1, 'draft');

insert into public.question_options (question_id, label, text, is_correct)
select id, 'A', 'visible text', true from public.questions
where text = '__rls_approved__';

insert into public.student_sessions (student_id, token_hash, expires_at)
select s.id, repeat('a', 64), now() + interval '30 days'
from public.students s where s.display_name = '__rls_test__';

insert into public.practice_history
  (student_id, session_id, mode, answer)
select s.id, ss.id, 'practice', '{}'::jsonb
from public.students s
join public.student_sessions ss on ss.student_id = s.id
where s.display_name = '__rls_test__';

-- ============================================================================
-- TEST 1 — ANONYMOUS
-- ============================================================================
set role anon;
set "request.jwt.claims" = '{}';

do $$
declare n int;
begin
  select count(*) into n from public.students;
  if n <> 0 then raise exception 'RLS FAIL: anon read students'; end if;

  select count(*) into n from public.student_sessions;
  if n <> 0 then raise exception 'RLS FAIL: anon read student_sessions'; end if;

  select count(*) into n from public.exam_attempts;
  if n <> 0 then raise exception 'RLS FAIL: anon read exam_attempts'; end if;

  select count(*) into n from public.practice_history;
  if n <> 0 then raise exception 'RLS FAIL: anon read practice_history'; end if;

  select count(*) into n from public.student_answers;
  if n <> 0 then raise exception 'RLS FAIL: anon read student_answers'; end if;

  select count(*) into n from public.questions where text = '__rls_approved__';
  if n <> 1 then raise exception 'RLS FAIL: anon cannot read approved question'; end if;
  select count(*) into n from public.questions where text = '__rls_draft__';
  if n <> 0 then raise exception 'RLS FAIL: anon sees draft question'; end if;

  -- answer-bearing columns must NOT be selectable (grant-level check)
  begin
    perform correct_answer_text from public.questions limit 1;
    raise exception 'RLS FAIL: anon can read correct_answer_text';
  exception when insufficient_privilege then null;
  end;

  begin
    perform is_correct from public.question_options limit 1;
    raise exception 'RLS FAIL: anon can read is_correct';
  exception when insufficient_privilege then null;
  end;

  -- anon cannot write content
  begin
    insert into public.questions (type, text, marks, status)
    values ('mcq', '__rls_intrusion__', 1, 'approved');
    raise exception 'RLS FAIL: anon inserted a question';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ============================================================================
-- TEST 2 — AUTHENTICATED NON-ADMIN
-- ============================================================================
set role authenticated;
set "request.jwt.claims" =
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{}}';

do $$
declare n int;
begin
  select count(*) into n from public.students;
  if n <> 0 then raise exception 'RLS FAIL: non-admin read students'; end if;

  select count(*) into n from public.practice_history;
  if n <> 0 then raise exception 'RLS FAIL: non-admin read practice_history'; end if;

  begin
    insert into public.questions (type, text, marks, status)
    values ('mcq', '__rls_intrusion2__', 1, 'approved');
    raise exception 'RLS FAIL: non-admin inserted a question';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ============================================================================
-- TEST 3 — ADMIN (app_metadata.role = 'admin')
-- ============================================================================
set role authenticated;
set "request.jwt.claims" =
  '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated","app_metadata":{"role":"admin"}}';

do $$
declare n int;
begin
  select count(*) into n from public.students;
  if n < 1 then raise exception 'RLS FAIL: admin cannot read students'; end if;

  select count(*) into n from public.questions where text = '__rls_draft__';
  if n <> 1 then raise exception 'RLS FAIL: admin cannot see draft question'; end if;

  select count(*) into n from public.practice_history;
  if n < 1 then raise exception 'RLS FAIL: admin cannot read practice_history'; end if;

  insert into public.questions (type, text, marks, status)
  values ('mcq', '__rls_admin_write__', 1, 'draft');
end $$;

-- ============================================================================
-- TEST 4 — SERVICE ROLE bypasses RLS
-- ============================================================================
set role service_role;
set "request.jwt.claims" = '{}';

do $$
declare n int;
begin
  select count(*) into n from public.students;
  if n < 1 then raise exception 'RLS FAIL: service_role cannot read students'; end if;
end $$;

-- ============================================================================
-- Reset role, then cleanup fixtures (as postgres)
-- ============================================================================
reset role;
reset "request.jwt.claims";

delete from public.students where display_name = '__rls_test__';
delete from public.questions
where text in ('__rls_approved__', '__rls_draft__', '__rls_admin_write__',
               '__rls_intrusion__', '__rls_intrusion2__');
