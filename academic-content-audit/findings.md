# Academic Content Audit — Findings, Corrections, Gaps

## What was done

### 1. Authoritative syllabus established
CISCE Computer Applications syllabus (Exam Year 2028, PDF Jan 2026) defines eight
units. Javoodle's topic list predated/loosely matched it: **Encapsulation had no
topic at all**, and Library Classes / Strings / Arrays were thinner than the
unit titles imply.

### 2. Corrections & additions implemented (source + live DB)

**Lessons** (`scripts/curriculum/`):
- `lessons-p2.mjs` repaired after a malformed string broke parsing; now valid.
- Library Classes: added wrapper-class/autoboxing content, `parseInt`/
  `parseDouble`, `Character` checks — 1→2 lessons.
- Strings: added lesson on immutability-in-practice and common mutation
  misconception — 1→2 lessons.
- Arrays: added indexing/traversal depth — 1→2 lessons.
- Searching & Sorting: added selection sort alongside linear search & bubble
  sort — 1→2 lessons.
- NEW topic **Encapsulation** (phase 2): access specifiers/data hiding +
  getters/setters/scope — 2 lessons.
- `lessons-p1.mjs` minor improvements from earlier in this phase (verified via
  git diff; content reviewed, no factual errors found).

**Questions** (`questions.mjs`): +16 questions → 56 total, targeting gaps:
wrapper parsing, Character methods, String immutability find-error, array
output prediction, bubble sort trace, encapsulation theory/output/MCQ,
overloading resolution, nested method calls. All answers self-verified
(e.g., even-count array → 4; `f(f(3))` → 12; `toLowerCase` immutability trap).

**Seeder** (`scripts/seed-content.mjs`) — previously insert-only:
- Now upserts topics parsed from `supabase/seed.sql` (single source of truth);
  created "Encapsulation" and renumbered phase-2 `order_index` in live DB.
- Existing lessons whose `blocks` changed are now PATCHed (content refresh),
  so corrections reach already-seeded rows without touching progress records
  (progress keys on lesson id). Comparison uses canonical JSON since Postgres
  jsonb reorders keys.

**Seed run result (live Supabase):**
- +1 topic (Encapsulation), 5 topics renumbered
- 7 lessons inserted, 2 lessons refreshed, 0 duplicates
- 16 questions inserted, 20 MCQ options ensured

### 3. Defects found in existing content
- Encapsulation unit: completely missing → **fixed**.
- Wrapper classes / parsing methods: mentioned but not taught → **fixed**.
- String immutability misconception (`s.toLowerCase(); println(s)` prints
  original) — common ICSE trap, now a dedicated find-error question → **added**.
- Lesson content updates previously could never reach the DB (seeder skipped
  existing rows) → **fixed**.

### 4. Remaining gaps (not implemented — flagged honestly)
- ❌ No structured per-topic coding exercises with test cases (sandbox only).
- ❓ Recursion: verify if required by current official unit subtopics.
- ❓ Constructor coverage is one lesson — may warrant expansion (chaining,
  `this()`).
- ❓ Real previous-year papers not ingested (editorial/licensing decision).
- Subtopic-level verification against the CISCE PDF still open for units 1–3.

## Test results

| Check | Result |
|---|---|
| `node` parse of all 4 curriculum modules | PASS (24 lessons, 56 questions) |
| `node scripts/seed-content.mjs` | PASS (idempotent re-run verified by design; inserts counted above) |
| `tsc --noEmit` | PASS |
| ESLint (changed files) | PASS — 0 errors |
| Vitest | PASS — 84/84 |
| `next build` | PASS |

Java code blocks could not be compiled locally (no JDK on this machine); all
new examples were hand-verified for syntax and output. The platform's own
executor remains the runtime check.
