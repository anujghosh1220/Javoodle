-- ============================================================================
-- Javoodle · 0002_answer_column_privileges.sql
-- Fix for databases that already ran 0001_init.sql.
--
-- Supabase cloud auto-grants table-level SELECT on new public tables to
-- anon/authenticated. That grant exposes EVERY column, so the column-level
-- grants in 0001 cannot hide answer keys. Revoke the table-level SELECT on
-- the two answer-bearing tables, then re-apply the column grants.
-- Safe to run on a live database — no data is touched.
-- ============================================================================

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
