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

-- ---------------------------------------------------------------------------
-- Phase 3 Question Studio fixtures & checks (additive)
-- ---------------------------------------------------------------------------

insert into public.documents (filename, mime, storage_path, kind, status, source_type, original_filename)
values ('__qs_doc__.pdf','application/pdf','documents/__qs__/x.pdf','pdf','uploaded','other','__qs_doc__.pdf');

insert into public.document_extractions (document_id, attempt, status, extractor, extracted_text)
select id, 1, 'extracted', 'unpdf', '__qs_text__' from public.documents where filename='__qs_doc__.pdf';

insert into public.question_import_batches (filename, raw_payload, payload_hash, summary, status)
values ('__qs_batch__.json', '{"questions":[]}'::jsonb, repeat('b',64), '{"total":0}'::jsonb, 'imported');

insert into public.questions (type, text, marks, status, question_status, answer_status, correct_answer_text, proposed_answer, model_answer, explanation)
values
  ('mcq','__qs_approved__',1,'approved','approved','approved','secret', '"p"'::jsonb, '"m"'::jsonb, '"e"'::jsonb),
  ('mcq','__qs_pending__',1,'pending','pending_review','unverified','secret2', '"p2"'::jsonb, '"m2"'::jsonb, '"e2"'::jsonb);

insert into public.question_review_events (question_id, action, field)
select id, 'seed_event', 'test' from public.questions where text='__qs_approved__';

-- ANON: cannot see studio tables or pending questions or answer columns
set role anon; set "request.jwt.claims"='{}';
do $$
declare n int;
begin
  select count(*) into n from public.document_extractions;
  if n <> 0 then raise exception 'RLS FAIL: anon read document_extractions'; end if;
  select count(*) into n from public.question_import_batches;
  if n <> 0 then raise exception 'RLS FAIL: anon read question_import_batches'; end if;
  select count(*) into n from public.question_review_events;
  if n <> 0 then raise exception 'RLS FAIL: anon read question_review_events'; end if;
  select count(*) into n from public.documents where filename='__qs_doc__.pdf';
  if n <> 0 then raise exception 'RLS FAIL: anon read documents'; end if;
  select count(*) into n from public.questions where text='__qs_pending__';
  if n <> 0 then raise exception 'RLS FAIL: anon sees pending_review question'; end if;
  select count(*) into n from public.questions where text='__qs_approved__';
  if n <> 1 then raise exception 'RLS FAIL: anon cannot read approved question (question_status)'; end if;
  begin perform proposed_answer from public.questions limit 1; raise exception 'RLS FAIL: anon can read proposed_answer'; exception when insufficient_privilege then null; end;
  begin perform model_answer from public.questions limit 1; raise exception 'RLS FAIL: anon can read model_answer'; exception when insufficient_privilege then null; end;
  begin perform reference_solution from public.questions limit 1; raise exception 'RLS FAIL: anon can read reference_solution'; exception when insufficient_privilege then null; end;
  begin perform marking_rubric from public.questions limit 1; raise exception 'RLS FAIL: anon can read marking_rubric'; exception when insufficient_privilege then null; end;
  begin perform provenance from public.questions limit 1; raise exception 'RLS FAIL: anon can read provenance'; exception when insufficient_privilege then null; end;
end $$;

-- NON-ADMIN: cannot read/write studio tables or pending
set role authenticated;
set "request.jwt.claims"='{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{}}';
do $$
declare n int;
begin
  select count(*) into n from public.document_extractions;
  if n <> 0 then raise exception 'RLS FAIL: non-admin read document_extractions'; end if;
  select count(*) into n from public.question_import_batches;
  if n <> 0 then raise exception 'RLS FAIL: non-admin read question_import_batches'; end if;
  select count(*) into n from public.question_review_events;
  if n <> 0 then raise exception 'RLS FAIL: non-admin read question_review_events'; end if;
  select count(*) into n from public.questions where text='__qs_pending__';
  if n <> 0 then raise exception 'RLS FAIL: non-admin sees pending question'; end if;
end $$;

-- ADMIN: can access studio tables and pending questions
set role authenticated;
set "request.jwt.claims"='{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated","app_metadata":{"role":"admin"}}';
do $$
declare n int;
begin
  select count(*) into n from public.document_extractions where extracted_text='__qs_text__';
  if n < 1 then raise exception 'RLS FAIL: admin cannot read document_extractions'; end if;
  select count(*) into n from public.question_import_batches where filename='__qs_batch__.json';
  if n < 1 then raise exception 'RLS FAIL: admin cannot read question_import_batches'; end if;
  select count(*) into n from public.question_review_events where action='seed_event';
  if n < 1 then raise exception 'RLS FAIL: admin cannot read question_review_events'; end if;
  select count(*) into n from public.questions where text='__qs_pending__';
  if n < 1 then raise exception 'RLS FAIL: admin cannot read pending question'; end if;
end $$;

reset role; reset "request.jwt.claims";
delete from public.question_import_batches where filename='__qs_batch__.json';
delete from public.documents where filename='__qs_doc__.pdf';
delete from public.questions where text in ('__qs_approved__','__qs_pending__');
