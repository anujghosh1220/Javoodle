-- ============================================================================
-- Javoodle · RLS verification script
-- Run in the Supabase SQL Editor (or psql) as postgres AFTER 0001_init.sql.
-- Simulates anon / authenticated-student / authenticated-admin contexts by
-- setting the JWT claims GUC that auth.jwt() reads.
-- Every block raises an exception on failure — "no output" = all passed.
-- ============================================================================

-- 0. Fixture: one student, one session, one approved + one draft question.
insert into public.students (display_name) values ('__rls_test__')
on conflict do nothing;

insert into public.questions (type, text, marks, status)
values
  ('mcq', '__rls_approved__', 1, 'approved'),
  ('mcq', '__rls_draft__',    1, 'draft');

do $$
declare
  v_student uuid;
  v_session uuid;
begin
  select id into v_student from public.students where display_name = '__rls_test__';
  insert into public.student_sessions (student_id, token_hash, expires_at)
  values (v_student, repeat('a', 64), now() + interval '30 days')
  returning id into v_session;

  -- stash ids for later blocks via temp table
  create temp table if not exists rls_ids (k text primary key, v uuid);
  insert into rls_ids values ('student', v_student), ('session', v_session)
  on conflict (k) do update set v = excluded.v;
end $$;

-- ============================================================================
-- 1. ANONYMOUS: cannot see private student data, sees only approved content.
-- ============================================================================
do $$
declare n int;
begin
  set local role anon;
  set local request.jwt.claims = '{}';

  select count(*) into n from public.students;
  if n <> 0 then raise exception 'RLS FAIL: anon read students (% rows)', n; end if;

  select count(*) into n from public.student_sessions;
  if n <> 0 then raise exception 'RLS FAIL: anon read student_sessions'; end if;

  select count(*) into n from public.exam_attempts;
  if n <> 0 then raise exception 'RLS FAIL: anon read exam_attempts'; end if;

  select count(*) into n from public.practice_history;
  if n <> 0 then raise exception 'RLS FAIL: anon read practice_history'; end if;

  select count(*) into n from public.questions where text = '__rls_draft__';
  if n <> 0 then raise exception 'RLS FAIL: anon sees draft question'; end if;

  select count(*) into n from public.questions where text = '__rls_approved__';
  if n <> 1 then raise exception 'RLS FAIL: anon cannot read approved question'; end if;
end $$;

-- ============================================================================
-- 2. AUTHENTICATED NON-ADMIN: same restrictions as anon on private data,
--    cannot write content.
-- ============================================================================
do $$
declare n int;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{}}';

  select count(*) into n from public.students;
  if n <> 0 then raise exception 'RLS FAIL: non-admin read students'; end if;

  begin
    insert into public.questions (type, text, marks, status)
    values ('mcq', '__rls_intrusion__', 1, 'approved');
    raise exception 'RLS FAIL: non-admin inserted a question';
  exception when insufficient_privilege then null;
    when raise_exception then
      if sqlerrm like '%intrusion%' then raise; end if;
  end;
end $$;

-- ============================================================================
-- 3. ADMIN: full access.
-- ============================================================================
do $$
declare n int;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated","app_metadata":{"role":"admin"}}';

  select count(*) into n from public.students;
  if n < 1 then raise exception 'RLS FAIL: admin cannot read students'; end if;

  select count(*) into n from public.questions where text = '__rls_draft__';
  if n <> 1 then raise exception 'RLS FAIL: admin cannot see draft question'; end if;

  insert into public.questions (type, text, marks, status)
  values ('mcq', '__rls_admin_write__', 1, 'draft');
end $$;

-- ============================================================================
-- 4. Cleanup fixtures.
-- ============================================================================
delete from public.questions where text like '\_\_rls\_%' escape '\';
delete from public.student_sessions where token_hash = repeat('a', 64);
delete from public.students where display_name = '__rls_test__';
