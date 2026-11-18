// Phase 3 lessons — Revision, PYQs and timed practice

const L = (title, blocks) => ({ title, blocks });

export const lessonsP3 = [
  {
    topic: "Full Syllabus Revision",
    lessons: [
      L("Smart revision strategy", [
        { type: "paragraph", text: "Revision isn't re-reading — it's **active recall**: close the book, write what you remember, then check. For Java, that means tracing code mentally and rewriting programs from scratch." },
        { type: "list", items: [
          "Week 1: variables, operators, conditions, loops — predict outputs without running code.",
          "Week 2: classes, objects, methods, constructors, overloading.",
          "Week 3: Strings, arrays, searching, sorting — write each algorithm once by hand.",
          "Daily: 10 MCQs + 1 output-prediction + 1 program skeleton in the Practice and Coding Lab.",
        ]},
        { type: "keypoint", text: "The highest-yield revision topics for ICSE: `Scanner` input/output format, string methods (`length`, `charAt`, `indexOf`, `equals`), array traversal loops, and bubble sort." },
        { type: "note", tone: "exam", text: "In the last week, prioritise previous-year papers over new topics — the paper pattern repeats heavily." },
      ]),
    ],
  },
  {
    topic: "Previous Year Questions",
    lessons: [
      L("How to use PYQs effectively", [
        { type: "paragraph", text: "ICSE Computer Applications papers repeat concepts with new numbers and names. Solving **previous year questions (PYQs)** teaches you the examiner's style: question weightage, command words and output formats." },
        { type: "list", items: [
          "Attempt each PYQ under timed conditions — no peeking at answers.",
          "After solving, compare your output format character-by-character with the marking scheme.",
          "Group PYQs by topic (loops, strings, arrays…) and note which topics cost you marks.",
          "Re-solve the questions you got wrong after 3 days — spaced repetition locks them in.",
        ]},
        { type: "keypoint", text: "Most lost marks in Java papers come from output-formatting mistakes — missing spaces, wrong labels, or `println` vs `print` — not from wrong logic." },
        { type: "note", tone: "info", text: "Use the Exams section for full timed papers, and Practice for topic-wise PYQ-style drills." },
      ]),
    ],
  },
  {
    topic: "Timed Practice & Mock Exams",
    lessons: [
      L("Exam temperament and mock strategy", [
        { type: "paragraph", text: "A mock exam only helps if you treat it like the real one: same duration, same silence, same rules. Review every mistake afterwards — that's where the marks are won." },
        { type: "list", items: [
          "First 5 minutes: read the whole paper, plan time per section.",
          "Attempt sure-shot questions first; mark doubtful ones and return later.",
          "Reserve the last 10 minutes for re-checking output formats and syntax.",
          "After each mock: list your weak topics and do 20 targeted practice questions on them.",
        ]},
        { type: "keypoint", text: "In Java papers, never leave a program question blank — partial code with correct logic earns method marks even with small syntax slips." },
        { type: "note", tone: "exam", text: "Check your Growth page after every mock — it shows exactly which topics need revision." },
      ]),
    ],
  },
];
