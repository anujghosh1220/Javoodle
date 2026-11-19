# AI / Ollama Removal & Build Recovery — Report

## What was corrupted
`lib/student/name.ts` contained AI/robot server code plus pasted agent-transcript
junk (markdown fences, tool-call markup, migration SQL). Reconstructed as the
intended clean module: `normalizeStudentName` + `StudentNameTakenError` only.
No other source file contained pasted notes (searched for transcript markers).

## Files deleted
- `lib/ai/robot.ts` (entire `lib/ai/` — Ollama/memory/prompt layer)
- `app/api/robot/memory/route.ts`, `app/api/robot/mission/route.ts`
  (the `/api/robot/chat` route referenced by RobotChat did not exist — already absent)
- `components/mascot/RobotChat.tsx` (chat panel: chat/mission/memory fetches)
- `lib/mascot/codeEvents.ts` (code-error → AI event bridge)

## Files modified
- `components/mascot/RobotCompanion.tsx` — removed RobotChat import/render,
  chat state, code-error→chat effect, MessageCircle control button,
  unused `examMode` var. Kept: SVG robot, moods, MascotBrain roaming,
  obstacle avoidance, speech bubbles, idle lines, reactions, prefs/dock,
  poke, reduced-motion mode.
- `components/coding/CodingWorkspace.tsx`, `components/playground/PlaygroundWorkspace.tsx`
  — removed `emitRobotCodeError` calls and "Ask Robo" buttons; kept
  `emitRobotEvent` reactions (non-AI).
- `app/actions/student.ts` — `StudentNameTakenError` → friendly
  "That name is already taken" message.
- `.env.example`, `.env.local` — removed `OLLAMA_*` vars (no secrets touched).
- `lib/student/name.ts` — rebuilt clean.

## Preserved (non-AI)
- Visual robot companion: `Robot.tsx`, `controller.ts` (MascotBrain),
  `types.ts`, `events.ts`, `memory.ts` (real-stats companion memory),
  layout integration, controls, bubbles — all intact.
- Student registration: `normalizeStudentName`, case-insensitive matching,
  cookie sessions, `StudentNameTakenError`, `tests/student-name.test.ts`.
- `components/atmosphere/`, `lib/atmosphere/` — unrelated visual feature, untouched.
- `supabase/migrations/0009_student_name_unique.sql` — NEW file recreated
  (unique normalized-name index). **Must be applied** via Supabase SQL editor
  or `supabase db push` (CLI here targets local stack only). Until applied,
  duplicate protection relies on select-then-insert (small race window).

## Database
- `robot_memory` table migration (0010) was never written to disk — nothing to
  remove. If it exists in the live DB from earlier manual application, it is
  now unused; safe to drop manually (application has zero references).
- No other AI-only migrations existed.

## Verification (actually run)
- `npx tsc --noEmit` — clean (after clearing stale `.next/types`)
- `npx eslint .` — 0 errors, 5 pre-existing warnings (4 in audit scripts, 1 fixed)
- `npx vitest run` — **88/88 pass** (incl. 4 student-name tests)
- `npm run build` — PASS, no `/api/robot/*` routes remain
- Repo-wide grep: zero references to ollama/RobotChat/codeEvents/lib/ai/api/robot/Ask Robo
- Playwright smoke (temp student `ZZSmokeTest`, since deleted):
  landing → register → `/dashboard` 200, no console/page errors,
  chat button absent, companion still rendered. Screenshot: `ai-removal-dashboard.png`.

## Remaining issues
- Migration `0009` needs manual application for DB-level name uniqueness.
- Unused `robot_memory` table may remain in Supabase (harmless; drop optional).
- Uncommitted unrelated WIP remains in tree (atmosphere, globals.css,
  layout.tsx, Dashboard.tsx, CodeRain deletion) — left as found.
