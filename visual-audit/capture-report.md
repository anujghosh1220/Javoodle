# Javoodle Visual Audit — Capture Report

Generated: 2026-11-18T01:16:16.471Z
Base URL: http://localhost:3215

## Summary
- Routes discovered: 29
- Screenshots saved: 52
- Routes captured: 40
- Auth-blocked (admin, no credentials): 15 → admin-dashboard, admin-exams, admin-exam-new, admin-exam-editor, admin-exam-submissions, admin-questions, admin-question-bank, admin-question-import, admin-question-review, admin-question-upload, admin-question-editor, admin-coding, admin-coding-editor, admin-coding-submissions, admin-documents
- Unavailable (missing data): 3 → exams-unavailable, admin-exam-editor, exams-unavailable
- Errors: 0

## Notes
- Admin panel pages require Supabase Auth admin credentials — only /admin/login was captured; all other admin routes redirect to login (verified).
- Exam detail/runner/result captured only if a published exam exists (none found).
- Interactive states captured under states/: coding run (real OnlineCompiler execution), practice answer feedback, lesson completion (+XP), playground.
- Console errors and failed requests are recorded per-route in screenshot-manifest.json.

## Files
- index.html — visual gallery
- screenshot-manifest.json — per-route metadata
- desktop/ mobile/ states/ failures/ — PNG captures
