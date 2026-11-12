# Javoodle — Live Integration Test Checklist

Run AFTER `.env.local` is configured and the migration + seed are applied.
Mark each item only when actually executed. Results recorded in
`docs/CHECKLIST.md`.

## A. Connectivity

- [ ] `GET /auth/v1/health` returns 200 with publishable key
- [ ] `GET /rest/v1/topics?select=name` returns seeded rows (anon key)
- [ ] `npm run dev` boots without env warnings

## B. Student session

- [ ] First visit `/` → enter name → redirected to `/dashboard`
- [ ] Dashboard shows real (zeroed) stats, mascot, greeting with name
- [ ] Refresh page → same name, same stats (session recovered)
- [ ] New incognito window → enter SAME name → same `student_id`
      (verify via admin dashboard student count stays 1)
- [ ] Enter DIFFERENT name → separate student record
- [ ] Sign out ("Switch learner") → cookies cleared → `/dashboard` redirects
- [ ] Expired session: manually set `expires_at` in the past via SQL →
      next request redirects to `/`
- [ ] Revoked session: set `revoked_at` via SQL → next request redirects
- [ ] DB check: `student_sessions.token_hash` is 64-hex, raw token absent

## C. Admin

- [ ] `/admin` signed-out → 307 → `/admin/login`
- [ ] Login with admin credentials → lands on `/admin` dashboard with counts
- [ ] Non-admin Supabase user login → bounced back to `/admin/login`
- [ ] Logout → session cleared → `/admin` redirects again
- [ ] Admin role WITHOUT re-login (stale JWT) → still rejected until refresh

## D. Security / RLS

- [ ] `supabase/tests/rls_checks.sql` runs clean in SQL Editor
- [ ] anon REST: `students`, `exam_attempts`, `practice_history` → empty/denied
- [ ] anon REST: `questions?status=eq.draft` → empty; approved rows lack
      `correct_answer_text`/`explanation` columns
- [ ] anon REST: `question_options` rows lack `is_correct`
- [ ] anon REST: hidden `test_cases` → empty
- [ ] authenticated non-admin cannot insert questions (RLS)
- [ ] student cannot read another student's `practice_history` (no access
      path exists — service role only, keyed by validated session)

## E. Application

- [ ] Dashboard stats update after seeded data exists
- [ ] Topics list retrievable (anon) for Learn page (Phase 6 wiring)
- [ ] `npm run build` passes
- [ ] `npm run lint` clean
- [ ] `npm test` — all unit tests pass
