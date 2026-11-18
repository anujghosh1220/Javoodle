# ICSE Class 10 CA — Syllabus Coverage Matrix

Legend: ✅ Complete · 🟡 Partially covered · ❌ Missing · ❓ Requires verification

Counts are SOURCE content (scripts/curriculum/*), verified identical to the live
DB after the seed run recorded in findings.md (24 lessons, 56 questions).

## Official units (CISCE, Exam Year 2028)

| # | Official unit | Javoodle topic(s) | Lessons | Questions | Status | Gaps |
|---|---|---|---|---|---|---|
| 1 | Revision of Class IX Syllabus | Introduction to Computing & Java; Variables & Data Types; Operators; Conditional Statements; Loops | 5 | 16 | 🟡 | Class IX revision breadth (earlier Java exposure) assumed; dedicated revision drills exist under "Full Syllabus Revision". Verify exact Class IX carry-over list against PDF. |
| 2 | Class as the Basis of All Computation | Classes & Objects; Methods; Method & Constructor Overloading | 4 | 8 | 🟡 | Core covered well. ❓ Whether official unit includes `static` members, `this`, object relationships beyond basics — verify subtopics. |
| 3 | User-defined Methods | Methods | 2 | 3 | 🟡 | Method overloading covered under Overloading topic. ❓ Recursion: present in current syllabus? Verify — not currently a dedicated lesson. |
| 4 | Constructors | Constructors | 1 | 2 | 🟡 | Single lesson is thin for a guaranteed exam area. Recommend: default/parameterized, constructor chaining, `this()`. |
| 5 | Library Classes | Library Classes | 2 | 5 | 🟡 | Now covers wrapper classes, parsing, Character checks (added this phase). ❓ Exact prescribed class list (Math, StringBuilder, Scanner, wrappers) — verify against PDF. |
| 6 | Encapsulation | Encapsulation (NEW topic) | 2 | 3 | 🟡→✅ | Was entirely missing. Now: access specifiers, getters/setters, scope. ❓ `protected`/package-private depth and inheritance-adjacent scope questions — verify. |
| 7 | Arrays | Arrays | 2 | 6 | ✅ | 1-D/2-D declaration, traversal, indexing, length, search loops. Strong coverage. |
| 8 | String Handling | Strings | 2 | 7 | ✅ | Immutability, methods, comparison, charAt/length, StringBuilder contrast. Strong coverage. |

## Javoodle enrichment (NOT claimed as official units)

| Topic | Lessons | Questions | Rationale |
|---|---|---|---|
| Searching & Sorting | 2 | 4 | Recommended practice; linear/binary search, bubble/selection sort. Standard exam-relevant skill even if not a named unit. |
| Intermediate Programming Problems | 1 | 1 | Board-style program design practice. |
| Full Syllabus Revision | 1 | 1 | Mixed drills. |
| Previous Year Questions | 1 | 1 | PYQ-style practice guidance. |
| Timed Practice & Mock Exams | 1 | 1 | Exam simulation guidance. |

## Coding exercises

- Java Playground sandbox (`__playground_sandbox__` coding_question) — free-form.
- Coding Lab exercises are admin-authored per exam; no per-topic coding question
  bank exists in seed data. ❌ **Gap:** syllabus topics lack structured coding
  exercises with test cases (only the sandbox). Recommend adding topic-linked
  coding questions where the coding_questions schema supports it.

## Exam-question coverage

- Practice bank now spans: concept MCQs, fill-blank, true/false, find-error,
  output prediction, theory — matching the broad ICSE question-style mix.
- Dedicated PYQ topic exists but contains guidance lessons, not actual
  previous-year papers. ❓ Whether real PYQs should be ingested is a content
  licensing/editorial decision, not implemented here.
