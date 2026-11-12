# Javoodle

Little steps. Big breakthroughs. — a private ICSE Class 10 Computer
Applications (Java) learning and examination platform.

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript strict · Tailwind CSS 4 ·
Supabase (Postgres + Auth + Storage) · Vitest · Vercel

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

The app runs without Supabase in a cookie-only dev mode (no persistence).
For full functionality:

1. Create a Supabase project and copy the three keys into `.env.local`
   (see `.env.example` — never commit real values).
2. Apply `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`
   (SQL Editor or `supabase db push`).
3. Create an admin user in Supabase Auth and grant the role:

   ```sql
   update auth.users
   set raw_app_meta_data =
     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'you@example.com';
   ```

4. Verify policies: run `supabase/tests/rls_checks.sql` in the SQL Editor.

## Commands

| Command           | Purpose                        |
| ----------------- | ------------------------------ |
| `npm run dev`     | Dev server                     |
| `npm run build`   | Production build               |
| `npm run lint`    | ESLint                         |
| `npm test`        | Vitest unit tests              |

## Docs

- `docs/ARCHITECTURE.md` — system design, session & auth model, RLS
- `docs/DATABASE.md` — schema, setup steps, admin role grant
- `docs/FREE_TIER.md` — infrastructure limits & constraints
- `docs/CHECKLIST.md` — phase-by-phase progress
