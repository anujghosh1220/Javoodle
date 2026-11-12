-- ============================================================================
-- Javoodle · 0003_question_studio.sql
-- Phase 3: document extraction metadata, independent answer approval,
-- review audit trail, import batches, private storage bucket.
-- Safe to run on the live database — additive only.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- documents: extraction + provenance metadata
-- ---------------------------------------------------------------------------
alter table public.documents
  add column if not exists source_year      smallint,
  add column if not exists source_type      text
    check (source_type is null or source_type in
      ('pyq','specimen','school','notes','marking_scheme','other')),
  add column if not exists description      text,
  add column if not exists extracted_text   text,
  add column if not exists extraction_status text not null default 'pending'
    check (extraction_status in
      ('pending','extracting','extracted','extraction_failed','needs_manual_review')),
  add column if not exists extraction_meta  jsonb not null default '{}'::jsonb,
  add column if not exists extracted_at     timestamptz;

create index if not exists documents_extraction_idx
  on public.documents(extraction_status);

-- ---------------------------------------------------------------------------
-- questions: widen status set + independent answer status
-- ---------------------------------------------------------------------------
alter table public.questions
  drop constraint if exists questions_status_check;
alter table public.questions
  add constraint questions_status_check check (status in
    ('draft','pending','pending_review','approved','rejected','needs_revision'));

alter table public.questions
  add column if not exists answer_status text not null default 'unverified'
    check (answer_status in ('unverified','approved','rejected','needs_revision')),
  add column if not exists answer_verified_at timestamptz,
  add column if not exists source_question_number text,
  add column if not exists provenance jsonb not null default '{}'::jsonb;

create index if not exists questions_answer_status_idx
  on public.questions(answer_status);
create index if not exists questions_pending_idx
  on public.questions(status) where status in ('pending','pending_review','needs_revision');

-- ---------------------------------------------------------------------------
-- question_review_events — audit trail for every admin decision
-- ---------------------------------------------------------------------------
create table if not exists public.question_review_events (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  event       text not null,           -- approved|rejected|edited|answer_approved|...
  actor       text not null,           -- admin email/id
  payload     jsonb not null default '{}'::jsonb,  -- reason, field diffs
  created_at  timestamptz not null default now()
);

create index if not exists review_events_question_idx
  on public.question_review_events(question_id, created_at desc);

alter table public.question_review_events enable row level security;

create policy review_events_admin_all on public.question_review_events
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.question_review_events
  to authenticated;
grant select, insert, update, delete on public.question_review_events
  to service_role;

-- ---------------------------------------------------------------------------
-- question_import_batches — provenance for JSON imports
-- ---------------------------------------------------------------------------
create table if not exists public.question_import_batches (
  id             uuid primary key default gen_random_uuid(),
  filename       text,
  item_count     int not null default 0,
  imported_count int not null default 0,
  failed_count   int not null default 0,
  errors         jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);

alter table public.question_import_batches enable row level security;

create policy import_batches_admin_all on public.question_import_batches
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.question_import_batches
  to authenticated;
grant select, insert, update, delete on public.question_import_batches
  to service_role;

-- ---------------------------------------------------------------------------
-- Private storage bucket for source documents.
-- Access only via service-role signed URLs — never public.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-documents',
  'question-documents',
  false,
  8388608,  -- 8 MB per file (Vercel Hobby request limit is ~4.5 MB anyway)
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png','image/jpeg']
)
on conflict (id) do nothing;

-- Storage objects: the bucket is private (public=false) and all access goes
-- through the service role (signed URLs) after admin authorization, so no
-- storage.objects policies are required. Adding none keeps anon/authenticated
-- fully locked out of document files.
