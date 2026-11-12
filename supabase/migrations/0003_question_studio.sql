-- ============================================================================
-- Javoodle · 0003_question_studio.sql
-- Phase 3: Question Studio — documents, extraction, import, review, bank,
-- versioning/audit, independent approvals, private storage.
-- Additive/compatible with 0001/0002. Safe for existing data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums / shared helpers
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.document_source_type as enum (
    'previous_year_paper', 'specimen_paper', 'school_paper', 'notes',
    'marking_scheme', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_extraction_status as enum (
    'pending', 'extracting', 'extracted', 'extraction_failed', 'needs_manual_review'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_review_status as enum (
    'pending_review', 'approved', 'rejected', 'needs_revision'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.answer_review_status as enum (
    'unverified', 'approved', 'rejected', 'needs_revision'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Documents: extend existing table (keep backward-compatible columns)
-- ---------------------------------------------------------------------------

alter table public.documents
  add column if not exists source_year smallint,
  add column if not exists source_type public.document_source_type not null default 'other',
  add column if not exists description text,
  add column if not exists file_size bigint,
  add column if not exists original_filename text,
  add column if not exists storage_bucket text not null default 'question-documents',
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists extraction_error text,
  add column if not exists extracted_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- broaden kind to include explicit image subtypes while remaining compatible
alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents
  add constraint documents_kind_check
  check (kind in ('pdf','docx','image','json','png','jpg','jpeg'));

-- broaden status for extraction lifecycle (keep legacy values)
alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents
  add constraint documents_status_check
  check (status in (
    'uploaded','processing','processed','failed',
    'extracting','extracted','extraction_failed','needs_manual_review'
  ));

-- backfill originals/metadata for any existing rows
update public.documents
set original_filename = coalesce(original_filename, filename)
where original_filename is null;

-- ---------------------------------------------------------------------------
-- Document extractions (history/latest attempts)
-- ---------------------------------------------------------------------------

create table if not exists public.document_extractions (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents(id) on delete cascade,
  attempt           int not null default 1,
  status            public.document_extraction_status not null default 'pending',
  extractor         text, -- 'unpdf' | 'mammoth' | 'ocr' | 'manual' | 'none'
  extracted_text    text,
  structured        jsonb not null default '{}'::jsonb, -- pages, blocks, tables, refs
  page_count        int,
  warnings          jsonb not null default '[]'::jsonb,
  needs_manual_review boolean not null default false,
  error_message     text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (document_id, attempt)
);

create index if not exists document_extractions_document_idx
  on public.document_extractions(document_id, attempt desc);
create index if not exists document_extractions_status_idx
  on public.document_extractions(status);

drop trigger if exists document_extractions_set_updated_at on public.document_extractions;
create trigger document_extractions_set_updated_at
  before update on public.document_extractions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Question import batches
-- ---------------------------------------------------------------------------

create table if not exists public.question_import_batches (
  id                  uuid primary key default gen_random_uuid(),
  source_document_id  uuid references public.documents(id) on delete set null,
  imported_by         uuid references auth.users(id) on delete set null,
  filename            text,
  raw_payload         jsonb not null,
  payload_hash        text,
  summary             jsonb not null default '{}'::jsonb, -- counts, errors, duplicates
  status              text not null default 'imported'
                      check (status in ('validated','imported','failed','partial')),
  created_at          timestamptz not null default now()
);

create index if not exists question_import_batches_document_idx
  on public.question_import_batches(source_document_id);
create index if not exists question_import_batches_created_idx
  on public.question_import_batches(created_at desc);

-- ---------------------------------------------------------------------------
-- Questions: extend for studio (preserve existing columns/data)
-- ---------------------------------------------------------------------------

-- expand type set
alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions
  add constraint questions_type_check check (type in (
    'mcq','fib','truefalse','output','error','theory','program',
    'fill_blank','true_false','output_prediction','find_error','coding'
  ));

-- new review/status columns (independent approvals)
alter table public.questions
  add column if not exists question_status public.question_review_status,
  add column if not exists answer_status public.answer_review_status,
  add column if not exists parent_question_id uuid references public.questions(id) on delete cascade,
  add column if not exists order_index int not null default 0,
  add column if not exists group_key text,
  add column if not exists source_question_number text,
  add column if not exists proposed_answer jsonb,
  add column if not exists model_answer jsonb,
  add column if not exists reference_solution jsonb,
  add column if not exists marking_rubric jsonb,
  add column if not exists provenance jsonb not null default '{}'::jsonb,
  add column if not exists import_batch_id uuid references public.question_import_batches(id) on delete set null,
  add column if not exists extra jsonb not null default '{}'::jsonb; -- preserves unsupported/extra fields

create index if not exists questions_parent_idx on public.questions(parent_question_id);
create index if not exists questions_question_status_idx on public.questions(question_status);
create index if not exists questions_answer_status_idx on public.questions(answer_status);
create index if not exists questions_import_batch_idx on public.questions(import_batch_id);
create index if not exists questions_source_doc_idx on public.questions(source_document_id);
create index if not exists questions_source_year_idx on public.questions(source_year);

-- Backfill independent statuses from legacy status WITHOUT losing data.
-- Existing answers are treated as unverified (conservative) unless explicitly
-- reviewed later; correct_answer_text/explanation/ai_metadata are preserved.
update public.questions
set
  question_status = coalesce(
    question_status,
    case status
      when 'approved' then 'approved'::public.question_review_status
      when 'rejected' then 'rejected'::public.question_review_status
      else 'pending_review'::public.question_review_status
    end
  ),
  answer_status = coalesce(answer_status, 'unverified'::public.answer_review_status),
  provenance = case
    when (provenance = '{}'::jsonb or provenance is null) then jsonb_build_object(
      'legacy', true,
      'migrated_from_status', status,
      'source_document_id', source_document_id,
      'source_page', source_page,
      'source_year', source_year
    )
    else provenance
  end
where question_status is null or answer_status is null or provenance = '{}'::jsonb;

alter table public.questions
  alter column question_status set default 'pending_review',
  alter column question_status set not null,
  alter column answer_status set default 'unverified',
  alter column answer_status set not null;

-- keep legacy status column in sync for compatibility
create or replace function public.sync_legacy_question_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.question_status = 'approved' then
    new.status := 'approved';
  elsif new.question_status = 'rejected' then
    new.status := 'rejected';
  elsif new.question_status = 'needs_revision' then
    new.status := 'draft';
  else
    new.status := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists questions_sync_legacy_status on public.questions;
create trigger questions_sync_legacy_status
  before insert or update of question_status on public.questions
  for each row execute function public.sync_legacy_question_status();

-- ---------------------------------------------------------------------------
-- Review / audit events
-- ---------------------------------------------------------------------------

create table if not exists public.question_review_events (
  id               uuid primary key default gen_random_uuid(),
  question_id      uuid not null references public.questions(id) on delete cascade,
  actor_id         uuid references auth.users(id) on delete set null,
  actor_email      text,
  action           text not null, -- approved_question, rejected_question, edited, approved_answer, etc.
  field            text,          -- question_status | answer_status | content | answer | test_cases | rubric | ...
  reason           text,
  from_question_status public.question_review_status,
  to_question_status   public.question_review_status,
  from_answer_status   public.answer_review_status,
  to_answer_status     public.answer_review_status,
  previous_version  int,
  new_version       int,
  previous_snapshot jsonb,
  new_snapshot      jsonb,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists question_review_events_question_idx
  on public.question_review_events(question_id, created_at desc);
create index if not exists question_review_events_actor_idx
  on public.question_review_events(actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpful views for admin counts (security_invoker so RLS/grants apply)
-- ---------------------------------------------------------------------------

create or replace view public.question_studio_stats
with (security_invoker = true) as
select
  (select count(*)::int from public.documents) as documents_total,
  (select count(*)::int from public.documents d
     where d.status in ('uploaded','extracting')) as documents_awaiting_extraction,
  (select count(*)::int from public.questions) as questions_extracted,
  (select count(*)::int from public.questions q
     where q.question_status = 'pending_review') as questions_awaiting_review,
  (select count(*)::int from public.questions q
     where q.question_status = 'approved') as questions_approved,
  (select count(*)::int from public.questions q
     where q.question_status = 'rejected') as questions_rejected,
  (select count(*)::int from public.questions q
     where q.answer_status = 'unverified') as answers_unverified;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.document_extractions   enable row level security;
alter table public.question_import_batches enable row level security;
alter table public.question_review_events  enable row level security;

-- document_extractions: admin only
drop policy if exists document_extractions_admin_all on public.document_extractions;
create policy document_extractions_admin_all on public.document_extractions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- import batches: admin only
drop policy if exists question_import_batches_admin_all on public.question_import_batches;
create policy question_import_batches_admin_all on public.question_import_batches
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- review events: admin read/insert (append-only in practice)
drop policy if exists question_review_events_admin_all on public.question_review_events;
create policy question_review_events_admin_all on public.question_review_events
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- tighten questions public visibility: only approved question_status
drop policy if exists questions_public_read on public.questions;
create policy questions_public_read on public.questions
  for select to anon, authenticated
  using (question_status = 'approved');

-- question_options visibility tied to approved question_status
drop policy if exists question_options_public_read on public.question_options;
create policy question_options_public_read on public.question_options
  for select to anon, authenticated using (
    exists (
      select 1 from public.questions q
      where q.id = question_id and q.question_status = 'approved'
    )
  );

-- test_cases visibility: only non-hidden for approved questions (unchanged intent)
drop policy if exists test_cases_public_read on public.test_cases;
create policy test_cases_public_read on public.test_cases
  for select to anon, authenticated using (
    is_hidden = false and exists (
      select 1 from public.questions q
      where q.id = question_id and q.question_status = 'approved'
    )
  );

-- ---------------------------------------------------------------------------
-- Grants: protect answer-bearing/sensitive columns from students
-- ---------------------------------------------------------------------------

-- new studio tables: admin/service-role only
revoke all on public.document_extractions from anon, authenticated;
revoke all on public.question_import_batches from anon, authenticated;
revoke all on public.question_review_events from anon, authenticated;
grant all on public.document_extractions to service_role;
grant all on public.question_import_batches to service_role;
grant all on public.question_review_events to service_role;
grant select, insert, update, delete on public.document_extractions to authenticated;
grant select, insert, update, delete on public.question_import_batches to authenticated;
grant select, insert, update, delete on public.question_review_events to authenticated;

-- view: admin/service-role (contains cross-studio counts)
revoke all on public.question_studio_stats from anon, authenticated;
grant select on public.question_studio_stats to authenticated, service_role;

-- questions: ensure no table-level leak, re-grant SAFE columns only
revoke select on public.questions from anon, authenticated;
grant select (
  id, topic_id, type, text, marks, difficulty,
  source_document_id, source_page, source_year,
  status, version, created_at, updated_at,
  question_status, answer_status,
  parent_question_id, order_index, group_key, source_question_number
) on public.questions to anon, authenticated;

-- NEVER grant to anon/authenticated: correct_answer_text, explanation,
-- ai_metadata, proposed_answer, model_answer, reference_solution,
-- marking_rubric, provenance, import_batch_id, extra

-- question_options: keep is_correct hidden
revoke select on public.question_options from anon, authenticated;
grant select (
  id, question_id, label, text, order_index
) on public.question_options to anon, authenticated;

-- preserve admin write grants (RLS still enforces is_admin for authenticated)
grant insert, update, delete on public.document_extractions,
  public.question_import_batches, public.question_review_events
  to authenticated;

-- service_role already has all grants from 0001; ensure coverage
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Private Storage bucket + policies (Supabase Storage)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-documents',
  'question-documents',
  false,
  20971520, -- 20 MB sensible default for Vercel/Supabase Free
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS policies: admin-only access to this private bucket.
-- (service_role bypasses storage RLS; authenticated admins allowed via is_admin())
drop policy if exists "qd_admin_select" on storage.objects;
create policy "qd_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'question-documents' and public.is_admin());

drop policy if exists "qd_admin_insert" on storage.objects;
create policy "qd_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'question-documents' and public.is_admin());

drop policy if exists "qd_admin_update" on storage.objects;
create policy "qd_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'question-documents' and public.is_admin())
  with check (bucket_id = 'question-documents' and public.is_admin());

drop policy if exists "qd_admin_delete" on storage.objects;
create policy "qd_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'question-documents' and public.is_admin());

-- No anon/student policies: bucket is private and inaccessible to them.
