# Admin Student Directory — Implementation Report

## Data source
- **Students = `public.students` rows** (display_name, created_at). Students are
  NOT Supabase Auth users — they authenticate via cookie sessions
  (`student_sessions` token hash). Platform admins are Supabase Auth users with
  `app_metadata.role='admin'` in a separate system, so admin/staff exclusion is
  structural — admins can never appear in this directory.
- **Email: not collected.** Student registration is display-name only; the UI
  shows "Email not collected" explicitly rather than a fake value.
- Aggregates computed server-side (service role, after `requireAdmin()`):
  - Last active = max(`student_sessions.last_seen_at`, lesson `completed_at`,
    exam `started_at`, practice `created_at`, xp `created_at`)
  - Lessons = `lesson_completions` count; Exams = `exam_attempts` count;
    Practice = `practice_history` count. All real DB values — several are
    legitimately 0 today (those tables are new/sparse).

## Files changed
- `lib/admin/students.ts` (new) — `listStudentsDirectory()` + `getStudentDetail()`
- `app/admin/(panel)/students/page.tsx` (new) — directory: search (name),
  sort (newest / last active / A–Z), pagination (25/page), GET-form filters
- `app/admin/(panel)/students/[id]/page.tsx` (new) — read-only detail:
  stat cards + recent lessons / exam attempts / practice
- `components/admin/AdminNav.tsx` — added "Students" nav item
- `.gitignore` — `.dir-admin.json` (temp cred file pattern)

## Security
- Both pages sit under `app/admin/(panel)/` → `requireAdmin()` in layout;
  pages also call `requireAdmin()`/`connection()` directly.
- All queries use `createAdminClient()` (service role) server-side only;
  no keys reach the browser. No writes anywhere — directory is read-only.
- No schema changes, no RLS changes, no student-auth changes.

## Verified end-to-end (Playwright, temp admin account — since deleted)
- Unauthenticated → redirected to `/admin/login` ✅
- Temp admin (`app_metadata.role=admin`) login → directory renders ✅
- 8 real students listed with registration/activity/counts ✅
- Search `?q=anuj` → exactly the 2 matching students ✅
- Sort by last activity → most-recent-first ordering ✅
- Detail page → stats + recent sections render ✅
- Non-admin context → blocked ✅
- Screenshots: `academic-content-audit/shots/` (directory, search, detail)
- Reusable script: `academic-content-audit/dir-e2e.mjs`

## Checks
- `tsc --noEmit` clean · ESLint clean · Vitest 84/84 · `next build` PASS
  (routes `/admin/students`, `/admin/students/[id]` registered)

## Limitations
- Aggregation loads activity rows for the filtered roster into JS — fine at
  class scale; if the roster grows large, move to an RPC/GROUP BY query.
- "Exams" counts attempts (any status) — labelled "Exams attempted".
- No email column data exists by design; shown as "Email not collected".
