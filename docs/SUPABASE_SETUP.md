# Javoodle — Supabase Setup Guide

Free-tier Supabase project: https://supabase.com/dashboard

## 1. Create the project

1. New project → pick a region close to you → save the **database password**
   somewhere safe (needed only for CLI/direct-DB access, NOT for the app).
2. Wait ~2 min for provisioning.

## 2. Environment variables (`.env.local` — never commit)

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard → Project Settings → Data API → "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → "Publishable key" (`sb_publishable_…`). Legacy `anon` JWT also works. |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → "Secret key" (`sb_secret_…`). Legacy `service_role` JWT also works. **Server-only.** |

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_…
SUPABASE_SERVICE_ROLE_KEY=sb_secret_…
```

`.env.local` is gitignored (`.env*`). The app degrades to cookie-only mode
when these are absent — nothing breaks, but progress won't persist.

## 3. Apply the database

### Option A — SQL Editor (no CLI, no extra credentials) ✅ recommended first run

1. Dashboard → SQL Editor → New query.
2. Paste all of `supabase/migrations/0001_init.sql` → Run.
3. Paste all of `supabase/migrations/0002_answer_column_privileges.sql` → Run (required hardening).
4. Paste all of `supabase/migrations/0003_question_studio.sql` → Run (**Phase 3 Question Studio**: documents/extractions/import/review/audit, independent approvals, RLS/grants, private `question-documents` storage bucket + policies).
5. Paste all of `supabase/seed.sql` → Run.
6. Paste all of `supabase/tests/rls_checks.sql` → Run. Expect **no errors**
   (any `RLS FAIL` exception = a policy bug — report it).

All are idempotent-safe for a fresh DB where noted; migrations are additive/versioned (do not rewrite applied migrations). On an existing DB, apply only unapplied migrations in order.

### Storage (Question Studio)

- Migration 0003 creates/ensures private bucket `question-documents` (non-public, 20MB limit, PDF/DOCX/PNG/JPEG) with admin-only storage policies.
- If bucket/policies were not created (permissions), create bucket `question-documents` as **Private** in Storage and add policies allowing only admin users (`public.is_admin()`) to select/insert/update/delete objects in that bucket.
- Originals are never public; the app uses signed URLs/authorized server-side retrieval.

### Option B — Supabase CLI

```bash
npm i -g supabase          # or use npx supabase
supabase login             # browser auth — needs YOUR Supabase account
supabase link --project-ref <ref>   # asks for DB password once
supabase db push           # applies supabase/migrations/*.sql in order
psql "$DB_URL" -f supabase/seed.sql   # or paste seed.sql in SQL Editor
```

`supabase db reset` is **destructive** — never run it on the live project.

## 4. Provision the administrator

1. Dashboard → Authentication → Users → **Add user** → email + password,
   check "Auto Confirm User" (or confirm via the emailed link).
2. SQL Editor:

   ```sql
   update auth.users
   set raw_app_meta_data =
     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'you@example.com';
   ```

3. Sign in at `/admin/login`, then sign out/in once so the JWT picks up the
   new `app_metadata` claim.
4. `requireAdmin()` (`lib/admin/auth.ts`) rejects any user without
   `app_metadata.role = 'admin'` — the role can ONLY be granted via SQL /
   Dashboard, never through the app.

## 5. Verify

- `npm run dev` → enter a name → dashboard loads with zeroed stats.
- Refresh / reopen → same identity and stats (session recovered).
- `/admin` → redirects to `/admin/login` when signed out.
- `supabase/tests/rls_checks.sql` → clean run.
