# Product Excellence Audit — Findings & Changes

## Defect found & fixed (verified)

**Exam status filters used a stale lifecycle.** The live attempt lifecycle is
`in_progress → submitted → under_evaluation → evaluation_completed → result_published`
(`"evaluated"` is a legacy alias still accepted in a few read paths). Three
queries still filtered `status IN ("submitted","evaluated")` or
`status = "submitted"`, so real attempts were invisible to student metrics:

- `lib/student/stats.ts` — `getDashboardStats`: `examsTaken` and
  `averageExamScore` missed `under_evaluation`/`evaluation_completed`/
  `result_published` attempts — i.e. every attempt that actually had a score.
- `lib/student/stats.ts` — `getRecentStudentActivity`: `pendingEvals` counted
  only `submitted`, missing `under_evaluation` (awaiting admin grading after
  MCQ auto-eval); `latestResult` never matched `evaluated`.
- `lib/growth/data.ts` — Growth exam averages/best%/recent results used the
  same stale filter; percents derive from `total_score`, which is only set at
  `evaluation_completed`/`result_published`, so exam stats were effectively
  always empty.

Fix: all three queries now use the real post-submit status set (legacy
`"evaluated"` retained for backward compatibility). Server-side publish/eval
gating unchanged; no schema changes; no fake data.

## Verified

- `npx tsc --noEmit` — clean
- `npx eslint` on changed files — clean
- `npx vitest run` — 84/84 pass

## Audited, no change needed (code review)

- Dashboard: real aggregates only (xp_events, practice_history,
  lesson_completions, exam_attempts via service role after session auth);
  continue-learning uses `getNextLessonForStudent`; empty states honest.
- Learn/Practice/Coding/Playground/Exams/Result/Growth pages built in prior
  phases with real data access; exam lifecycle E2E-verified previously.
- Robot Companion: desktop collision/speech fixes already applied; mobile
  out of scope.

## Limitations

- Full UI re-audit of every student page was not repeated this pass; the
  previous visual audit (51 screenshots, no console errors) still stands.
- Content-quality review of seeded lessons/question bank not re-run; no
  demonstrable content errors were identified in this pass.
