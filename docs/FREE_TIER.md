# Javoodle — Free-Tier Infrastructure & Limits

## Vercel (Hobby)

- Serverless functions: 10s default timeout on Hobby (configurable to 60s max
  on Hobby? — actually Hobby caps at 60s for fluid/standard; keep handlers fast).
- Bandwidth 100 GB/mo, function invocations 125k/day — ample for one student.
- No persistent filesystem → uploaded documents MUST go to Supabase Storage,
  never local disk.
- Edge runtime not required; Node runtime for server actions.

## Supabase (Free)

- Postgres 500 MB, 1 active project, 50k MAU auth, 1 GB storage.
- **Auth**: email/password admin login uses MAU quota — fine for 1 admin.
- Edge Functions: 500k invocations/mo free.
- **RLS verification**: `supabase/tests/rls_checks.sql` runs in the SQL
  Editor — no extra infra needed.
- **Env vars required** (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
  Without them the app runs in cookie-only dev mode (no persistence).
- **Realtime/cron**: pg_cron available; scheduled jobs limited — fine.
- **PDF text extraction**: run server-side in route handler (pdf-parse) — memory
  OK for syllabus-size PDFs. For heavy/large files, offload later.
- **OCR**: tesseract.js runs in Node but is slow; alternative — admin uploads
  images and uses external OCR manually, or `tesseract.js` worker with limits.
  Keep behind a flag.

## Java execution (the big constraint)

- **Cannot** run Java on Vercel serverless (no JDK, 10-60s limits, cold starts).
- **Plan**: Piston API (`https://emkc.org/api/v2/piston`) — free, supports
  Java 17/OpenJDK, public instance. Behind `Executor` interface for swap-out.
- Risk: public Piston rate limits/availability. Mitigate: queue submissions,
  clear error states, optional self-hosted Piston on a free Oracle Cloud/Railway
  instance later (interface already abstracts it).
- Test-case evaluation calls executor once per submission (batch stdin runs) —
  cache compile result, run all test cases in one process where possible.

## AI

- Manual ChatGPT → structured JSON import (Phase 3). No paid API dependency.
- Optional later: OpenAI/Anthropic key in env — not required.

## Fonts/Assets

- Self-host or next/font Google fonts (build-time fetch; fine on Vercel).

## Question Studio (Phase 3) constraints

- **Storage:** private Supabase Storage bucket `question-documents` (no Vercel filesystem persistence). Free-tier storage/egress applies; 20MB per-file limit configured (adjustable within plan limits).
- **Extraction:** runs in server context using free libraries (`unpdf`, `mammoth`). Large/scanned PDFs and images may be partial/unreadable—image OCR is best-effort/manual-review in this implementation (no paid OCR/API). Statuses/retries and manual edit of extracted text are provided; never invent content.
- **AI:** manual ChatGPT workflow only (prompt + extracted content export/copy). No paid AI API dependency.
- **DB:** additive schema (migrations/import batches/audit/versions/snapshots) fits single-student/question-bank scale; monitor free-tier 500MB DB/storage quotas.
- **Security/ops:** signed URLs for private originals; service-role used only after server-side admin auth; RLS/column grants block student access to answers/rubrics/hidden tests/pending studio data.

## Summary of hard limits to design around

1. No JVM on Vercel → external executor (Piston) behind interface. ✅ planned
2. No local file storage → Supabase Storage for documents. ✅ implemented for Question Studio
3. Serverless timeouts → keep extraction/execution async-friendly with status tracking/retry/manual review. ✅
4. Free DB size → fine for one student + question bank (thousands of rows). ✅
