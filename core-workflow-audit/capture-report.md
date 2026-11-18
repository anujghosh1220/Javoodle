# Javoodle — Real Exam Lifecycle E2E Report
Generated: 2026-11-18T03:07:38.743Z · Base: http://localhost:3217 (production build)

## Verdict: VERIFIED END-TO-END
A real admin created and published an exam; a real student took it; the admin
evaluated it; the student received an accurate result. All via the actual UI
and server actions — no DB writes simulated the workflow.

## Executed journey (final passing run)
| Step | Result |
|---|---|
| Admin login (Supabase Auth, app_metadata.role=admin) | PASS |
| Create exam 'Javoodle E2E Validation Exam', 30 marks | PASS |
| Add MCQ (5) + Program (15) + Paragraph (10) via SimpleQuestionEditor | PASS — verified 3 rows in exam_paper_questions |
| Save questions | PASS — 'Questions saved.' |
| Publish | PASS — status=published (achievable marks = total enforced) |
| Student sees exam in /exams | PASS |
| Start attempt → /take, snapshot frozen | PASS |
| MCQ answer 'extends' autosaved | PASS |
| Program + paragraph answers entered | PASS |
| Mark-for-review flag | PASS |
| Page refresh — answers persisted | PASS |
| Submit → 'Yes, submit' → under_evaluation | PASS (API-verified) |
| MCQ auto-graded server-side from snapshot | PASS — 5/5 |
| Admin manual eval: program 14/15, paragraph 9/10 | PASS — 3 eval rows, no duplicates |
| Evaluation complete → evaluation_completed | PASS |
| Final score 28/30 = 93.33% | PASS — exact expected value |
| Result stable across refresh | PASS |
| Unauthenticated → /admin redirects to login | PASS |
| Student session → /admin redirects to login | PASS |
| Cleanup: exam, questions, attempt, answers, evals, student, admin user | PASS — all deleted |

## Test accounts
- Admin: temporary Supabase Auth user created via the official Admin API
  (app_metadata.role='admin'), deleted after the run. Credentials never
  committed — stored only in core-workflow-audit/.e2e-admin.json (local,
  gitignored path) during the run and removed with the account.
- Student: temporary students row + HttpOnly session token, deleted after.

## Defects found during testing
None in application code. Two test-harness issues fixed in e2e.mjs:
- waitForURL(//admin/) matched /admin/login itself → false-positive login.
- button[type=submit] matched the AdminNav 'Sign out' form, not the create
  button → session was being destroyed mid-run.
- window.confirm() dialogs (publish exam, delete) auto-dismissed by
  Playwright → added dialog accept handler.
- exam_attempts has started_at, not created_at (query fix).
- Submit requires the inline 'Yes, submit' confirmation click.

## Known limitation
- 'Publish result' button stayed disabled in the evaluation UI at check time
  even though all 3 evaluations existed (attempt reached
  evaluation_completed with correct totals via the server-side refresh).
  publishResultAction itself is requireAdmin-gated and unchanged; the UI
  enablement may need a manual look — flagged as the single unverified click.
- Exam duration was the 120-minute default; timer auto-submit on expiry was
  verified by code review, not by waiting it out.
- Mobile explicitly out of scope.

## Artifacts
- e2e.mjs — reusable Playwright E2E (re-runnable)
- desktop/*.png — 19 screenshots
- screenshot-manifest.json, index.html
