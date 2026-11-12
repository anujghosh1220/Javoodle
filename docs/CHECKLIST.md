# Javoodle — Implementation Checklist

## Phase 1 — Foundation ✅ in progress
- [x] Next.js 16 + TS strict + Tailwind scaffold
- [x] Design tokens + reusable UI primitives
- [x] Original SVG mascot
- [x] Landing page + name entry
- [x] Student session (UUID token, HttpOnly cookie)
- [x] Student dashboard shell (placeholder stats until DB)
- [ ] Supabase wiring (Phase 2)

## Phase 2 — Database & Admin ✅ implemented · 🟡 live-verification in progress
- [x] `@supabase/ssr` integration: browser/server/admin clients + `lib/env.ts` validation
- [x] `proxy.ts` session refresh on `/admin/*`
- [x] `supabase/config.toml` (CLI init, project_id `javoodle`)
- [x] Migration `0001_init.sql` — full normalized schema + indexes + triggers
      + pinned `search_path` + column-level answer protection
- [x] RLS on all 22 tables; anon sees only published/approved content;
      private student data has zero anon access; admin via `app_metadata.role`
- [x] `supabase/seed.sql` — ICSE topics across 3 phases (idempotent)
- [x] `supabase/tests/rls_checks.sql` — transaction-scoped role simulation
      covering anon / non-admin / admin / service_role + answer-column leaks
- [x] Student session persistence: hashed token (`sha256`), 30-day expiry,
      revocation, `last_seen_at`, find-or-create student by name
- [x] Cookie-only dev fallback when Supabase env is absent
- [x] Admin auth: `/admin/login` (Supabase Auth), `requireAdmin()` gate,
      `/admin` dashboard with real counts, logout
- [x] Dashboard wired to real stats (XP, questions, lessons, syllabus %)
- [x] vitest + 8 unit tests (tokens, expiry, name validation)
- [x] Docs: SUPABASE_SETUP.md, SECURITY_REVIEW.md, TESTING.md, DATABASE.md
- [x] `.env.local` configured with project keys (gitignored, verified
      `auth/v1/health` = 200)
- [ ] **Migration apply**: needs SQL Editor run (Option A) or Supabase
      login/PAT + DB password (Option B) — see docs/SUPABASE_SETUP.md
- [ ] **Live tests** (docs/TESTING.md): session persistence, admin login,
      RLS isolation — blocked until migration is applied
- [ ] Lesson content (blocks) — Phase 6

## Phase 3 — Question Studio
- [ ] Document upload → Supabase Storage
- [ ] PDF/DOCX/image extraction pipeline
- [ ] Zod-validated JSON import/export
- [ ] Side-by-side review UI, approve/reject/edit
- [ ] Question bank: search/filter/duplicate detection
- [ ] Question versioning on edit

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
