# Final Exam Hardening — Report
2026-11-18T03:53:32.844Z

## Root cause (Publish result disabled)
EvaluationWorkspace tracked per-question 'saved' flags in useState initialized
once from the evaluations prop. Auto-evaluated MCQ rows and evaluations saved
before mount (or via router.refresh races) were not reflected in the local
flags, so allEvaluated could stay false while the DB had every required
evaluation — the button stayed disabled even though publishResultAction's
server-side check would have allowed it.

## Fix
components/admin/exams/EvaluationWorkspace.tsx — evaluatedCount now counts a
question as evaluated when EITHER the local saved flag is set OR a row exists
in the server-provided evaluations prop (serverEvaluated set). No state sync
effect needed; publishResultAction still independently validates eligibility.

## Timer expiry
Verified end-to-end: second student attempt, deadline_at shortened via
service-role on the test record only, runner auto-submitted on expiry
(status submitted -> under_evaluation as MCQ auto-eval ran). Refresh stable,
no double-submit.

## E2E results (final run)
admin login PASS · exam create PASS · 3 questions saved+verified PASS ·
publish PASS · attempt+answers+flag+refresh-persist PASS · submit PASS ·
under_evaluation PASS · eval progress -> publish button ENABLED PASS ·
Publish result clicked -> result_published PASS · student result 28/30
93.33% PASS · stable on refresh PASS · timer auto-submit PASS ·
security (unauth+student blocked) PASS · cleanup PASS · pageerrors none

## Verification
npx tsc --noEmit clean · eslint 0 errors (4 warnings in test script only) ·
vitest 84/84 · next build PASS
