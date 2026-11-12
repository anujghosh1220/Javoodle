# Javoodle — Implementation Checklist

## Phase 1 — Foundation ✅ implemented (locally verified)
- [x] Next.js 16 + TS strict + Tailwind scaffold
- [x] Design tokens + reusable UI primitives
- [x] Original SVG mascot
- [x] Landing page + name entry
- [x] Student session (UUID token, HttpOnly cookie)
- [x] Student dashboard shell (placeholder stats until DB)
- [ ] Supabase wiring (Phase 2)

## Phase 2 — Database & Admin
- **Locally verified (code):** `@supabase/ssr` integration (browser/server/admin clients + `lib/env.ts`), `proxy.ts` refresh on `/admin/*`, migrations `0001_init.sql`/`0002_answer_column_privileges.sql`, RLS/policies/grants + answer-column protection, `supabase/seed.sql`, RLS checks script, student session persistence (hashed token, expiry, revocation, `last_seen_at`, find-or-create), cookie-only dev fallback, admin auth `/admin/login` + `requireAdmin()` + `/admin` dashboard, dashboard real-stats wiring, vitest unit tests, docs (SUPABASE_SETUP/SECURITY_REVIEW/TESTING/DATABASE).
- **Supabase-applied (pending):** apply `0001_init.sql`, `0002_answer_column_privileges.sql`, `seed.sql` in target project (SQL Editor/CLI) — not executed here.
- **Live E2E verified (pending):** `supabase/tests/rls_checks.sql` run in SQL Editor, session persistence/recovery, admin login/logout/role enforcement, RLS isolation against live data — blocked until migrations applied.

## Phase 3 — Question Studio
- **Locally verified (code, lint/build/tests executed):**
  - [x] `supabase/migrations/0003_question_studio.sql` (additive, not rewriting applied migrations): document/extraction/import/audit tables, independent `question_status`/`answer_status` + legacy-status backfill/sync trigger, provenance/subquestion/group fields, RLS/grants/column protections, private `question-documents` bucket + admin-only Storage policies.
  - [x] Admin routes (all server-side `requireAdmin()` guarded, panel layout gated): `/admin/questions` (dashboard, real Supabase-driven counts/activity), `/admin/questions/upload`, `/admin/documents`, `/admin/questions/import`, `/admin/questions/review`, `/admin/questions/bank`, `/admin/questions/[id]`; APIs `/api/admin/questions/[id]`, `/api/admin/documents/[id]/extraction`.
  - [x] Document upload/management: private Supabase Storage (`question-documents`), PDF/DOCX/PNG/JPG, drag-drop/multi/progress, type/size validation (20MB), safe filenames/paths, metadata (source year/type/description), signed/authorized server-side retrieval (no public URLs), delete with storage cleanup.
  - [x] Extraction abstraction (`lib/extraction`): PDF `unpdf`, DOCX `mammoth`, image/scanned best-effort → `needs_manual_review` (no OCR invention). Statuses `uploaded|extracting|extracted|extraction_failed|needs_manual_review`, attempt history, retries, editable extracted text, preserved original refs/page numbers/warnings/structured refs; diagrams/tables/scanned/unclear flagged; extraction never auto-publishes.
  - [x] AI/manual workflow: prompt generator (preserve wording/marks/numbering/topics/difficulty, provenance, no-invention, source-derived vs AI-generated) with copy/download prompt and extracted content.
  - [x] JSON import (`lib/questions/schema.ts` Zod): paste/upload, validate before import with exact question/field errors, preview, duplicate candidates (normalized/similarity, compare-only), transactional batch import as `pending_review` + `unverified`; types `mcq|fill_blank|true_false|output_prediction|find_error|theory|coding`, subquestions/groups/provenance, unsupported/extra retained.
  - [x] Review UI: side-by-side source vs editable fields, independent question/answer approve/reject/edit/needs-revision/unverified, flag/manual review, replacement via import flow; audit events recorded.
  - [x] Question bank: search/filter (topic/type/difficulty/year/source/statuses/marks/text), view/edit, version history & audit trail, delete with confirmation, duplicate comparison, export selected JSON.
  - [x] Versioning/audit: edits and review changes create immutable `question_versions` snapshots and `question_review_events` (actor/reason/timestamps/before-after/versions); historical exam snapshots remain immutable by design.
  - [x] Security hardening (code): all admin actions/APIs/pages guarded server-side; service-role only after admin auth; no student-facing reads of pending/answers/explanations/model solutions/rubrics/hidden tests/private AI metadata (RLS + column grants); private storage/signed access.
  - [x] Automated tests (local, no live creds): `tests/question-studio.test.ts` (import validation incl. all types, nested subquestions, MCQ/options, marks, exact field errors, extra-field preservation) and `tests/question-studio-utils.test.ts` (storage sanitization/kinds/paths/limits, prompt generation invariants). Lint/build/tests executed locally.
- **Supabase-applied (pending):** apply `0003_question_studio.sql` in Supabase project; ensure private bucket `question-documents` (20MB, PDF/DOCX/PNG/JPEG, admin-only policies) exists if not auto-created.
- **Live E2E verified (pending):** run `supabase/tests/rls_checks.sql` (incl. studio isolation/answer-column checks) in SQL Editor; verify upload→extract→retry→edit→delete+storage cleanup, signed/private access, prompt/export, ChatGPT JSON import (valid/invalid/duplicates/batch), side-by-side review, independent approvals (all combinations), bank search/filter/edit/history/export, version/audit persistence, and RLS/authorization against live Supabase/Storage.

## Phase 4 — Exam Engine
- [ ] Exam builder + section/choice config
- [ ] Publication validation
- [ ] Student exam UI: sections, palette, flagging, autosave
- [ ] Timer + unanswered warning + submit
- [ ] Results page: marks, section-wise, explanations

## Phase 5 — Coding & Evaluation
- [ ] Monaco editor + console (input/output)
- [ ] `Executor` interface + Piston integration
- [ ] Test-case evaluation, partial marks
- [ ] Theory rubric evaluation + admin override

## Phase 6 — Learn & Gamify
- [ ] Lesson renderer (blocks: text/code/output/note)
- [ ] Practice modes (MCQ/FIB/T-F/output/error/theory/program)
- [ ] XP ledger, levels, achievements
- [ ] My Growth analytics + weak-area suggestions

## Phase 7 — Deploy
- [ ] Vercel project + env vars
- [ ] Supabase prod settings (auth redirect URLs, storage policies)
- [ ] E2E: student session persistence, exam recovery, admin flow
