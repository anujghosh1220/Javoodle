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

- RLS enabled on all 22 tables. Private student tables have **no**
  anon/authenticated policies — only `is_admin()` SELECT; all student writes
  via service role post-validation. ✅
- Catalog reads filtered to `published`/`approved`. ✅
- **Answer secrecy is grant-level**, not just RLS: anon/authenticated column
  grants on `questions` exclude `correct_answer_text`, `explanation`,
  `ai_metadata`; on `question_options` exclude `is_correct`. Hidden
  `test_cases` and all `marking_rubrics` are admin-only. ✅
- Students cannot write marks, publish questions, or touch exams — no write
  policies exist for student roles on content tables. ✅
- `is_admin()` and `set_updated_at()` pin `search_path = ''`. ✅

## Server Actions / API surface

- Server Actions inherit Next.js origin checks; `allowedOrigins` is limited
  to the dev-preview proxy host. No arbitrary API routes exist yet that take
  student IDs. ✅
- Phase 1 name-entry action validates via Zod before any DB write. ✅

## Known limitations (accepted for v1)

- Token hash is unsalted SHA-256 — acceptable because tokens have 256 bits of
  entropy (no dictionary attack possible).
- No rate limiting on name entry / admin login beyond Supabase Auth built-ins.
- `findOrCreateStudent` reads all students to match names — fine at one-student
  scale; revisit if multi-student.
- Session fixation: token is generated server-side per login; old sessions
  remain valid until expiry/revocation (documented; revocation supported).
