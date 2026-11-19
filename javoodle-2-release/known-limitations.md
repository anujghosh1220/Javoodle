# Known Limitations

1. **Projects are mission-bundles**, not free-form builds — milestones verified via missions; no arbitrary project code evaluation yet.
2. **Visualizer is curated examples only** (6 programs) — deliberately not a Java interpreter; unsupported syntax cannot be visualized.
3. **Achievement criteria live in code** (`defs.ts`), not the `criteria` jsonb — typed/testable; table stores unlock records only.
4. **Achievement XP bonuses** are small (25–100) and granted once via ledger.
5. **Daily mission** rotates at UTC midnight; no timezone localization.
6. **No live E2E** of mission submit/achievement unlock against real Supabase+OnlineCompiler in this pass.
7. Motion Phase 1 largely reused existing system; new celebration primitive = UnlockToast only.
8. Visual QA screenshots for new pages pending — DOM/compile verified only.
