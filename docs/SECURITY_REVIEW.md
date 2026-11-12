# Javoodle — Security Review (Phase 2)

## Student session tokens

- Generated with `crypto.randomBytes(32)` → ~256 bits entropy. ✅
- Cookie value is the raw token; DB stores **SHA-256 hex only**
  (`student_sessions.token_hash`, unique, format-checked). A DB dump cannot
  be replayed as a session. ✅
- Name is never an authenticator — only the token is. `findOrCreateStudent`
  matches names for convenience but grants nothing by itself. ✅
- Cookie: `HttpOnly`, `Secure` (prod), `SameSite=Lax`, `Path=/`, 30-day
  `Max-Age` matching DB `expires_at`. ✅
- Validation is server-side on every request; expired (`expires_at`) and
  revoked (`revoked_at`) sessions are rejected and cookies cleared.
  `last_seen_at` updated at most every 5 min. ✅
- Client-supplied student IDs are never trusted: `studentId` comes only from
  the token lookup in `getStudentSession()`. ✅

## Admin authorization

- Supabase Auth email/password; session refreshed by `proxy.ts` on `/admin/*`.
- `requireAdmin()` / `getAdminUser()` verify `auth.getUser()` **and**
  `app_metadata.role === 'admin'` server-side on every admin page +
  `(panel)` layout. No UI-hiding reliance. ✅
- Role granted only via SQL `raw_app_meta_data` merge — cannot be self-assigned
  (app_metadata is not writable by `authenticated` users). ✅
- `signOut()` server action clears the Supabase session. ✅

## Service-role usage

- `lib/supabase/admin.ts` imports `server-only` and is used exclusively after
  authorization (student token validated / admin verified). ✅
- `SUPABASE_SERVICE_ROLE_KEY` is server-only; only `NEXT_PUBLIC_*` vars reach
  the browser, and those are the publishable/anon key (safe by design — RLS
  guards data). ✅
- No secrets are logged; env validation warns without printing values. ✅

## RLS & data exposure

- RLS enabled on all tables (including Phase 3 studio tables). Private student/studio tables have **no** anon/authenticated access; admin access via `is_admin()`; privileged writes/reads for studio flows use service role **only after server-side `requireAdmin()`/admin verification**. ✅
- Catalog reads: only `question_status='approved'` questions (and linked options/test cases where non-hidden) are visible to anon/authenticated; pending/rejected/needs_revision remain admin-only. ✅
- **Answer secrecy is grant-level and policy-level** (critical): anon/authenticated `SELECT` on `questions` is column-restricted to safe fields only (id/topic/type/text/marks/difficulty/source refs/status/version/review statuses/structure refs). **Never exposed to student-facing clients:** `correct_answer_text`, `explanation`, `ai_metadata`, `proposed_answer`, `model_answer`, `reference_solution`, `marking_rubric`, `provenance`, `import_batch_id`, `extra`. `question_options.is_correct` remains hidden; hidden `test_cases` and `marking_rubrics` remain admin-only. ✅
- Studio tables (`document_extractions`, `question_import_batches`, `question_review_events`) and private `documents` content are admin-only (RLS + grants); `question_studio_stats` view restricted from anon/authenticated. ✅
- Storage: private bucket `question-documents` (non-public) with admin-only storage policies; no public URLs. App serves originals/extracted context via signed URLs or authorized server-side retrieval only. ✅
- Students cannot write marks, publish/approve questions or answers, or access pending/import/review data. ✅
- `is_admin()` and triggers pin `search_path = ''`. Migration 0003 backfills/migrates legacy question states without dropping legacy columns; `rls_checks.sql` extended for studio isolation and answer-column leaks. ✅

## Server Actions / API surface

- Server Actions inherit Next.js origin checks; `allowedOrigins` is limited
  to the dev-preview proxy host. No arbitrary API routes exist yet that take
  student IDs. ✅
- Phase 1 name-entry action validates via Zod before any DB write. ✅

## Phase 3 Question Studio notes

- **Admin-only surface:** all studio routes/actions/APIs require server-side admin auth (`requireAdmin`/`getAdminUser`); no frontend-only protection. Service-role operations occur only after authorization.
- **Independent approvals:** `question_status` and `answer_status` are separate; questions can be approved with unverified answers. Only approved questions enter the published bank and questions with unverified answers must never be used for auto-marked exams (enforcement to be applied by exam engine).
- **Audit/versioning:** edits/approval changes create immutable version snapshots and review events (actor/reason/timestamps/before-after). Historical exam snapshots must remain unchanged.
- **Extraction transparency:** originals preserved in private storage; extraction stores text/pages/warnings/structured refs and flags unreadable/diagram/table/scanned/incomplete content for manual review; no silent invention/discard.
- **Import safety:** Zod validation with exact question/field errors, duplicate detection (compare-only), transactional batch import; unsupported fields retained.
- **Known limitation:** RLS SQL checks in repo are updated but must be executed in Supabase after applying migration 0003 to verify live policies/grants. Signed URLs are time-limited but should be treated as sensitive admin artifacts.

- Token hash is unsalted SHA-256 — acceptable because tokens have 256 bits of
  entropy (no dictionary attack possible).
- No rate limiting on name entry / admin login beyond Supabase Auth built-ins.
- `findOrCreateStudent` reads all students to match names — fine at one-student
  scale; revisit if multi-student.
- Session fixation: token is generated server-side per login; old sessions
  remain valid until expiry/revocation (documented; revocation supported).
