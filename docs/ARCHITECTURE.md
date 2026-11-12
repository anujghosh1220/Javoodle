# Javoodle — Architecture

## Directory structure

```
app/                    # Next.js App Router
  page.tsx              # landing / name entry
  (student)/            # student shell (nav + mascot layout)
    dashboard/page.tsx
    learn/page.tsx
    practice/page.tsx
    playground/page.tsx
    exams/page.tsx
    results/page.tsx
    growth/page.tsx
  admin/                # protected admin area (Supabase Auth)
    page.tsx            # admin dashboard
  api/
    student/session/route.ts   # create student session cookie
    student/session/route.ts   # create student session cookie
    ...
components/
  ui/                   # design-system primitives (Card, Button, Chip…)
  mascot/               # SVG robot mascot
  ...
lib/
  env.ts                 # zod-validated env + Supabase feature flags
  supabase/              # client (browser), server (cookie-bound), admin (service role)
  student/               # session.ts (auth), token.ts (hashing), stats.ts
  admin/                 # auth.ts (requireAdmin)
  validation/            # zod schemas
  eval/                  # evaluation engine (MCQ, FIB, output, theory)
proxy.ts                 # Next.js 16 middleware — Supabase session refresh on /admin/*
tests/                   # vitest unit tests
supabase/
  migrations/0001_init.sql
  seed.sql               # ICSE syllabus topics (3 phases)
  tests/rls_checks.sql   # RLS verification script
public/
docs/
  ARCHITECTURE.md       # this file
  DATABASE.md           # schema detail
  FREE_TIER.md          # infra limits
  CHECKLIST.md          # implementation checklist
```

## Student session model (implemented, Phase 2)

- Student enters display name only → server action calls
  `createStudentSession()` (`lib/student/session.ts`).
- A cryptographically random token (`jds_` + 32 random bytes, base64url) is set
  in the HttpOnly `javoodle_session` cookie (30 days, Secure in prod,
  SameSite=Lax). The display name lives in a separate readable
  `javoodle_name` cookie — it is NEVER a credential.
- **Only the SHA-256 hash of the token is stored** in
  `student_sessions.token_hash`. A DB leak yields no usable credentials.
- With Supabase configured: the session row links to a persistent
  `students` row (found-or-created by exact case-insensitive name match —
  v1 supports one student, so progress follows her across devices).
  `expires_at` (30d), `revoked_at`, `last_seen_at`, `user_agent` are tracked;
  validation happens server-side on every request via the service-role
  client after hashing the cookie token.
- Without Supabase credentials (local dev): cookie-only fallback keeps the
  app usable; `session.persistent === false` and stats return zeros.
- Never trust client-supplied student/session IDs — `studentId` is derived
  exclusively from the validated token server-side.

## Auth model (two layers, implemented)

1. **Student**: opaque bearer token cookie → hashed lookup in
   `student_sessions` → `student_id`. No Supabase Auth involved.
2. **Admin**: Supabase Auth email/password at `/admin/login`
   (`signInWithPassword` via the cookie-bound server client). Every admin
   page calls `requireAdmin()` (`lib/admin/auth.ts`) which verifies
   `auth.getUser()` AND `app_metadata.role === 'admin'` server-side.
   `proxy.ts` (Next.js 16 middleware) refreshes the Supabase session cookie
   on `/admin/*` routes only.
3. **Privileged DB access**: `lib/supabase/admin.ts` (service-role key,
   `server-only`) is used only after the relevant authorization check.
   The service key is never exposed to the browser.

## Auth model detail

- `lib/env.ts` — zod-validated env access; `isSupabaseConfigured()`,
  `hasServiceRoleKey()` gate all Supabase features.
- `lib/supabase/client.ts` — browser client (anon key, for Supabase Auth).
- `lib/supabase/server.ts` — cookie-bound server client (RLS applies).
- `lib/supabase/admin.ts` — service-role client, `server-only`.
- `proxy.ts` — session refresh for `/admin/*` (matcher-scoped).

## RLS model (implemented in 0001_init.sql)

- **Private student tables** (`students`, `student_sessions`,
  `lesson_completions`, `exam_attempts`, `student_answers`,
  `practice_history`, `xp_events`, `student_achievements`, `documents`):
  no anon/authenticated student access at all. Admin read via `is_admin()`;
  all student writes go through the service role after token validation.
- **Catalog content** (`topics`, published `lessons`, `approved` questions,
  their options + non-hidden test cases, `published` exams/sections/
  questions, `achievements`): anon/authenticated SELECT with status
  filters; writes require `is_admin()`.
- Hidden test cases and `marking_rubrics` are admin-only — students can
  never read expected outputs or rubrics, even for approved questions.
- `is_admin()` checks `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`.
- Verified by `supabase/tests/rls_checks.sql` (run in SQL Editor post-migration).

## Database schema (normalized)

Core tables (see `supabase/migrations/0001_init.sql`):

- `students`, `student_sessions`
- `topics` (syllabus tree, phase, order)
- `lessons` (topic_id, content blocks JSON)
- `documents` (upload metadata, storage path, type)
- `questions` (type, marks, topic_id, source doc/page, status, version)
- `question_options` (MCQ options + correct flag)
- `question_versions` (immutable snapshots for exam integrity)
- `test_cases` (input/expected output, hidden flag)
- `marking_rubrics` (criteria → marks)
- `exams`, `exam_sections`, `exam_questions`
- `exam_attempts`, `student_answers` (answer payload + evaluation JSON)
- `practice_history`
- `achievements`, `student_achievements`
- `xp_events` (XP ledger → level computed from sum)

All tables: UUID PKs, `created_at`/`updated_at` (+ `set_updated_at()` trigger
where mutable), FKs with explicit delete behavior, indexes on hot paths, RLS
enabled on everything. See `docs/DATABASE.md` for the RLS model and
`supabase/migrations/0001_init.sql` for the authoritative DDL.

## Evaluation engine

`lib/eval/` pure functions, unit-tested:

- `mcq`: exact option-id match → full/zero
- `fib`: normalized accepted-answer set (lowercase, trim, collapse spaces)
- `output`: normalized stdout comparison
- `theory`: keyword/rubric scoring, partial credit, admin-override flag
- `java`: compile+run via isolated executor (see FREE_TIER.md), test-case
  scoring with per-test partial credit; never full marks for compile-only

Every `student_answers.evaluation` stores a JSON breakdown (per-criterion marks,
matched rubric rows, test-case results).

## Java execution isolation

Untrusted Java must never run on the Next.js server. Options (free-tier):

1. **Piston API** (`emkc.org/api/v2/piston`) — free public code-execution API,
   supports Java (OpenJDK). Wrap behind `lib/executor/Executor` interface so it
   can be swapped for a self-hosted Piston instance later.
2. Fallback: queue + local Docker executor (not Vercel-compatible).

Interface: `executeJava(source, stdin, testCases) → { compile, stdout, stderr, testResults }`.
Time/memory limits enforced by the executor, not our code.

## AI pipeline

- Phase 3 ingests documents (pdf-parse / mammoth for DOCX / tesseract.js for
  scanned images) → raw text + structure.
- AI (ChatGPT, manual for now) produces a JSON conforming to
  `lib/validation/question.schema.ts` (zod) → imported via admin JSON importer.
- AI proposals are stored with `ai_proposed_*` fields and `verified=false`
  until admin approves; never auto-published.

## Design system

Tokens in `app/globals.css` + Tailwind theme:

- Colors: lavender `#A78BFA`/`#8B5CF6`, mint `#6EE7B7`/`#34D399`,
  warm yellow `#FDE68A`/`#F59E0B`, cream `#FFF8EC`/`#FDF6E3`.
- Radius: `rounded-2xl`/`rounded-3xl` cards, `rounded-full` chips.
- Typography: system rounded-friendly stack; headings semibold.
- Motion: framer-motion for page transitions, success confetti-lite, XP toasts.
- Mascot: original SVG robot (`components/mascot/Robot.tsx`) with mood props.
