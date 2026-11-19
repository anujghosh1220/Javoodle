# Javoodle 2.0 — Architecture Audit

Date: 2026-11-19 · Baseline commit: post-atmosphere-system `master`.

## Stack (verified)

Next.js 16.4.6 (App Router, Cache Components, `instant = false` on dynamic pages) · React 19 · TS · Tailwind 4 · Supabase (service-role admin client server-side only) · Monaco (`@monaco-editor/react` + local `monaco-editor`) · OnlineCompiler.io executor (server-only, `ONLINECOMPILER_API_KEY`) · Vitest · Playwright · framer-motion.

## Reusable systems

| System | Location | Reuse for |
|---|---|---|
| XP ledger | `xp_events` table + inserts in `app/actions/{learn,practice}.ts` | ALL new rewards — single source of truth, `amount`/`reason`/`ref_id` |
| Level calc | `levelForXp()` in `lib/growth/data.ts` — 150 XP/level | ranks derive from same XP, no second balance |
| Achievements tables | `achievements` + `student_achievements` (0001_init.sql, unique student+achievement, RLS-locked) | Phase 3 — tables exist, currently unused |
| Secure Java exec | `lib/coding/executor.ts` → `executeJava()`; playground + coding actions with DB rate limits (5/min, 60/hr) | missions, projects, visualizer examples |
| Playground sandbox | `runPlaygroundCodeAction` — run-only, no submission | mission "Run" + project milestone checks |
| Coding questions | `coding_questions` + test cases + submissions + review | Coding Lab stays as-is; missions are a separate curated layer |
| Student session | `getStudentSession()` → `{studentId, sessionRowId, displayName}` | auth for every new action |
| Atmosphere | `lib/atmosphere/*`, `AtmosphereProvider`, presets per route | add `/missions`, `/visualizer`, `/projects` presets — NO new canvas |
| Motion | `lib/motion.ts` tokens, `Reveal`/`RouteFade`/`StudentMain` fades, framer-motion | Phase 1 extends, doesn't duplicate |
| Robot | `RobotCompanion` + `lib/mascot/events.ts` (`emitRobotEvent`) + `REACTIONS` map | Phase 5 — extend map/messages only |
| UI kit | `Card`, `Button`, `Chip`, `ProgressBar`, `AnimatedNumber`, `PageHeader`, `Skeleton` | all new pages |

## Database state

Tables: students, student_sessions, topics, lessons, lesson_completions, documents, questions(+options/versions/test_cases/rubrics), exams(+sections/questions/paper_questions/attempts/answers/evaluations/optional_groups/selections), practice_history, **xp_events**, **achievements**, **student_achievements**, coding_questions(+test_cases/submissions/execution_runs), question_studio tables.

**Decision — no new tables.** Missions and projects persist progress through `xp_events` (`reason` + `ref_id`), which is already RLS-locked, indexed, and the canonical reward ledger. Idempotency = check-then-insert inside the server action (same pattern as `learn.ts` lesson completion). `student_achievements` unique constraint gives free idempotent unlocks. This avoids an unverifiable remote migration.

## Missing capabilities → plan

- Mission catalogue: static TS content (`lib/missions/catalogue.ts`) — briefing, I/O spec, hidden test cases (server-only module), hints, starter code, XP. Daily pick = deterministic hash of UTC date.
- Mission submit: `app/actions/missions.ts` — session auth → `executeJava` per hidden test → all-pass → single `xp_events` insert (`reason:'mission_completed'`, `ref_id`=mission uuid) → achievement re-eval.
- Achievements: `lib/achievements/` — code-defined criteria evaluated server-side against real tables; `student_achievements` rows inserted on first qualifying event (evaluated lazily on dashboard/growth load + after XP events).
- Ranks: pure function of total XP → 5 titles aligned to 150-XP levels.
- Visualizer: `lib/visualizer/` — deterministic step generators for curated examples (variables, arrays, loops, bubble/selection sort, strings). No Java parsing claims; explicit supported-example list.
- Projects: static catalogue (`lib/projects/`) — milestones verified by running milestone-specific hidden checks through the same executor; progress via `xp_events` (`reason:'project_milestone'`, ref = `projectId:milestoneIdx` encoded in a uuid5-style deterministic id? — ref_id is uuid; use deterministic uuid from slug hash).
- Robo: extend `REACTIONS` + route map + message library; emit events from new actions/pages.
- Motion Phase 1: small additions only — success/error toast primitive, XP burst hook, card tilt opt-in. Everything else exists.

## Conflicts / risks

- `coding_execution_runs.question_id` NOT NULL → mission/project runs reuse the playground sandbox row (same as playground does).
- Rate limits shared with playground — acceptable (same student budget).
- `xp_events` has no unique constraint → idempotency enforced in action code (check-then-insert), matching existing convention.
- Achievement `criteria` jsonb exists but unused → we keep criteria in code (typed, testable) and use the table only for unlock records.
- OnlineCompiler key may be absent in dev → executor returns `unavailable`; UI must degrade gracefully (already the pattern).
- Admin routes: new features are student-only; admin untouched.

## Security checklist

Session-derived studentId only · hidden test cases in `server-only` modules · no client-trusted XP/completion · rate-limited execution · no new secrets · RLS unchanged.
