import type {
  ExamDraft,
  DraftQuestion,
  DraftSection,
  DraftOptionalGroup,
  ExamDraftMeta,
  McqOption,
  PaperQuestionType,
} from "@/lib/exams/shared";

/**
 * Deterministic question-paper parser.
 *
 * Converts extracted PDF page text into an editable exam draft. No AI, no
 * network — pure heuristics. Anything uncertain is surfaced via `warnings`
 * and `unparsedBlocks` so the admin can fix it in the review UI; text is
 * never silently dropped.
 */

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
};

function parseCountToken(tok: string): number | null {
  const t = tok.trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  return NUMBER_WORDS[t] ?? null;
}

// --- marker patterns ---------------------------------------------------------

const RE_PAGE = /^---\s*Page\s+\d+\s*---\s*$/i;
const RE_RUNNING_HEAD = /^(javoodle\b.*|.*\bpage\s+\d+\s*$)/i;
const RE_END_MARKER = /end of (the )?question paper|—\s*end\s*of/i;
const RE_SECTION = /^\s*(?:section|part)\s+([A-Za-z]|\d{1,2})\b\s*[:\-–—.]?\s*(.*)$/i;
const RE_QUESTION_HEADER = /^\s*questions?\s+(\d{1,2})\s*(?:\[\s*(\d{1,3}(?:\.\d+)?)\s*\])?\s*[:\-–—.)]?\s*(.*)$/i;
const RE_TOP_Q = /^\s*(\d{1,2})\s*[.)]\s+(.+)$/;
const RE_DOT_Q = /^\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*[.)]?\s+(.+)$/;
const RE_SUB_Q = /^\s*(\d{1,2})\s*\(\s*([A-Za-z]|[ivxIVX]{1,4})\s*\)\s*[.)]?\s*(.*)$/;
const RE_NUMBERED_PART = /^\s*\(\s*(\d{1,2})\s*\)\s*(.+)$/;
const RE_BARE_SUB_Q = /^\s*\(\s*([a-zA-Z]|[ivxIVX]{1,4})\s*\)\s*[.)]?\s+(.+)$/;
const RE_OPTION = /^\s*\(?\s*([A-Ja-j])\s*[.)]\s+(.+)$/;
const RE_OPTION_INNER = /[(\[]\s*([A-Ja-j])\s*[.)]\s+/g;
const RE_ANY_OPTION_MARKER = /[(\[]\s*([A-Ja-j])\s*[.)]\s+/g;
const RE_INSTRUCTION_HEAD = /^\s*instructions?\b\s*[:\-–—.]?\s*(.*)$/i;

const RE_MARKS_TRAIL =
  /(?:\[|\()\s*(\d{1,3}(?:\.\d+)?)\s*(?:marks?)?\s*(?:\]|\))\s*$/i;
const RE_MARKS_WORD =
  /(?:^|\s)(\d{1,3}(?:\.\d+)?)\s*marks?\b\s*$/i;
const RE_MARKS_COLON = /marks?\s*[:\-–—]?\s*(\d{1,3}(?:\.\d+)?)\s*$/i;

function extractMarks(text: string): { marks: number | null; rest: string } {
  let m = text.match(RE_MARKS_TRAIL);
  if (m) return { marks: Number(m[1]), rest: text.slice(0, m.index).trimEnd() };
  m = text.match(RE_MARKS_WORD);
  if (m) return { marks: Number(m[1]), rest: text.slice(0, m.index).trimEnd() };
  m = text.match(RE_MARKS_COLON);
  if (m) return { marks: Number(m[1]), rest: text.slice(0, m.index).trimEnd() };
  return { marks: null, rest: text };
}

// --- metadata ----------------------------------------------------------------

function detectMeta(lines: string[]): { meta: ExamDraftMeta; consumed: Set<number> } {
  const meta: ExamDraftMeta = {
    title: null,
    subject: null,
    class_name: null,
    duration_minutes: null,
    reading_time_minutes: null,
    total_marks: null,
    instructions: null,
  };
  const consumed = new Set<number>();
  const head = lines.slice(0, 25);

  // Title FIRST: prefer a line that looks like a paper title; otherwise the
  // first substantive head line that isn't metadata, a section header, a
  // question marker, an MCQ option or a sub-part.
  const isTitleCandidate = (line: string) =>
    line.length >= 4 &&
    line.length <= 140 &&
    !/^(page|instructions?|section|part)\b/i.test(line) &&
    !/^\d+\s*[.)]/.test(line) &&
    !/^\(?\s*[A-Ja-j]\s*[.)]/.test(line) &&
    !/^\(\s*[a-z]\s*\)/i.test(line) &&
    !line.includes("?");
  for (let i = 0; i < head.length; i++) {
    const line = head[i].trim();
    if (isTitleCandidate(line) && /paper|exam|test|assessment/i.test(line)) {
      meta.title = line;
      consumed.add(i);
      break;
    }
  }
  if (!meta.title) {
    for (let i = 0; i < head.length; i++) {
      const line = head[i].trim();
      if (isTitleCandidate(line)) {
        meta.title = line;
        consumed.add(i);
        break;
      }
    }
  }

  head.forEach((raw, i) => {
    if (consumed.has(i)) return; // already claimed (e.g. as title)
    const line = raw.trim();
    if (!line) return;

    let m: RegExpMatchArray | null;
    if ((m = line.match(/subject\s*[:\-–—]\s*(.+)$/i))) {
      meta.subject = m[1].trim();
      consumed.add(i);
      return;
    }
    if ((m = line.match(/(?:maximum\s+)?marks\s*[:\-–—]?\s*(\d{1,3})\b/i)) && /mark/i.test(line)) {
      if (meta.total_marks === null) meta.total_marks = Number(m[1]);
      // Combined header lines ("Maximum Marks: 100 Time Allowed: 2 Hours")
      // still carry the duration — parse it before consuming the line.
      const tm = line.match(/time\s*(?:allowed|duration)?\s*[:\-–—]?\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/i);
      if (tm && meta.duration_minutes === null && !/reading/i.test(line)) {
        const n = Number(tm[1]);
        const unit = tm[2].toLowerCase();
        meta.duration_minutes = unit.startsWith("h") ? Math.round(n * 60) : Math.round(n);
      }
      consumed.add(i);
      return;
    }
    // Time/reading BEFORE class — combined lines like
    // "Reading Time: 15 Minutes Class: X" must not be eaten by class.
    if ((m = line.match(/time\s*(?:allowed|duration)?\s*[:\-–—]?\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/i)) &&
        !/reading/i.test(line)) {
      const n = Number(m[1]);
      const unit = m[2].toLowerCase();
      meta.duration_minutes = unit.startsWith("h") ? Math.round(n * 60) : Math.round(n);
      consumed.add(i);
      return;
    }
    if ((m = line.match(/reading\s+time\s*[:\-–—]?\s*(\d+(?:\.\d+)?)/i))) {
      meta.reading_time_minutes = Math.round(Number(m[1]));
      consumed.add(i);
      return;
    }
    // "Class: X", "Class X", "ICSE Class 10", "Std VII" — capture only the
    // class token, never the rest of the title line.
    if ((m = line.match(/\bclass\s*[:\-–—]\s*(.+)$/i)) ||
        (m = line.match(/\b(?:icse|isc|cbse)?\s*class\s*[-–—]?\s*([xivXIV]{1,6}|\d{1,2}[a-z]?)/i)) ||
        (m = line.match(/\bstd\.?\s*[-–—]?\s*([xivXIV]{1,6}|\d{1,2}[a-z]?)/i))) {
      const token = m[1].trim().replace(/\s+/g, " ");
      meta.class_name = /^class|icse|isc|cbse|std/i.test(token) ? token : `Class ${token}`;
      consumed.add(i);
      return;
    }
  });

  // Title was already picked before metadata marking (see above).

  // If no explicit subject/class found, try loose matches in the head.
  if (!meta.subject) {
    for (const line of head) {
      const m = line.match(/(computer applications?|informatics practices?|mathematics|physics|chemistry|biology|english|history|geography|economics|accountancy)/i);
      if (m) {
        meta.subject = m[1].trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      }
    }
  }
  if (!meta.class_name) {
    for (const line of head) {
      const m = line.match(/\b(class|std|standard)\s*[-–—:]?\s*(x{0,3}i{0,3}v?|\d{1,2})(?:\s|$|[-–—:])/i);
      if (m) {
        meta.class_name = `Class ${m[2].toUpperCase().replace(/X/g, "X").replace(/I/g, "I").replace(/V/g, "V")}`;
        break;
      }
      const m2 = line.match(/\b(ICSE|ISC|CBSE)\b/i);
      if (m2 && /class|std/i.test(line)) {
        meta.class_name = line.trim();
        break;
      }
    }
  }
  return { meta, consumed };
}

// --- main parser -------------------------------------------------------------

interface PendingQ {
  number: string;
  dotted: boolean;
  sub: string | null;
  header: string;
  marks: number | null;
  options: McqOption[];
  sectionKey: string;
  order: number;
}

export function parseExamPaperDraft(pages: string[]): ExamDraft {
  const warnings: string[] = [];
  const unparsedBlocks: string[] = [];

  // Flatten pages into lines, dropping page markers, running heads/footers,
  // and stopping at the end-of-paper marker.
  const rawLines: string[] = [];
  for (const page of pages) {
    for (const l of String(page ?? "").split(/\r?\n/)) {
      const t = l.trim();
      if (!t || RE_PAGE.test(t) || RE_RUNNING_HEAD.test(t)) continue;
      if (RE_END_MARKER.test(t)) break;
      rawLines.push(t);
    }
    if (rawLines.length > 0 && RE_END_MARKER.test(rawLines[rawLines.length - 1])) break;
  }
  if (rawLines.length === 0) {
    return {
      meta: { title: null, subject: null, class_name: null, duration_minutes: null, reading_time_minutes: null, total_marks: null, instructions: null },
      sections: [],
      optional_groups: [],
      questions: [],
      warnings: ["No extractable text found in the PDF — it may be scanned or image-only."],
      unparsedBlocks: [],
      confidence: "low",
    };
  }

  const { meta, consumed: metaConsumed } = detectMeta(rawLines);

  // Pass 1: walk lines, tracking current section, collecting markers,
  // instructions block, and optional-question rules.
  const sections: DraftSection[] = [];
  const questions: DraftQuestion[] = [];
  const optionalRules: Array<{ sectionKey: string; pickCount: number; line: string }> = [];
  const instructionsLines: string[] = [];
  let inInstructions = false;
  let currentSectionKey = "sec-a";
  let qCounter = 0;
  let keyCounter = 0;
  const nextKey = (p: string) => `${p}${keyCounter++}`;

  // Ensure a default section exists for content before any header.
  sections.push({ key: "sec-a", title: "Section A", order_index: 0 });

  let current: PendingQ | null = null;
  const finished: PendingQ[] = [];
  let lastTopNumber: string | null = null;
  // "Each question/part carries N marks" rules, scoped to the section and
  // position where they appear — applied only to markless questions after
  // the nearest preceding rule in the same section.
  const markRules: Array<{ sectionKey: string; marks: number; order: number }> = [];

  const flushCurrent = () => {
    if (current) {
      finished.push(current);
      current = null;
    }
  };

  const startQuestion = (number: string, header: string, marks: number | null, sectionKey: string, dotted = false, sub: string | null = null) => {
    flushCurrent();
    current = {
      number,
      dotted,
      sub,
      header,
      marks,
      options: [],
      sectionKey,
      order: qCounter++,
    };
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const headIdx = rawLines.indexOf(line); // not reliable for dupes; ordering via loop is fine
    void headIdx;

    // Skip metadata-consumed head lines.
    if (i < 25 && metaConsumed.has(i)) {
      if (process.env.PARSE_DEBUG) console.log("SKIP meta", i, line.slice(0, 60));
      continue;
    }

    // Section header
    const m = line.match(RE_SECTION);
    if (m && !/^\d/.test(line)) {
      flushCurrent();
      const label = (m[1] || "").toUpperCase();
      const rest = (m[2] || "").trim();
      const title = rest
        ? `Section ${label} — ${rest.replace(/[:\-–—]+$/, "").trim()}`
        : `Section ${label}`;
      const key = `sec-${nextKey("")}`;
      // If the default empty section has no questions yet, rename it instead.
      const last = sections[sections.length - 1];
      const hasQuestions = finished.length > 0 || current !== null;
      if (!hasQuestions && sections.length === 1 && last.key === "sec-a") {
        last.key = key;
        last.title = title;
        currentSectionKey = key;
      } else {
        sections.push({ key, title, order_index: sections.length });
        currentSectionKey = key;
      }
      inInstructions = false;
      continue;
    }

    // Instructions block
    const im = line.match(RE_INSTRUCTION_HEAD);
    if (im) {
      flushCurrent();
      inInstructions = true;
      if (im[1]?.trim()) instructionsLines.push(im[1].trim());
      continue;
    }
    if (inInstructions) {
      // Instructions end only at a real section header or "Question N" —
      // numbered/bulleted instruction lines must NOT become questions.
      if (RE_SECTION.test(line) || RE_QUESTION_HEADER.test(line)) {
        inInstructions = false;
      } else {
        instructionsLines.push(line);
        continue;
      }
    }

    // Per-section mark instruction ("Each question carries 1 mark.").
    const mr =
      line.match(/each\s+(?:sub-?)?(?:questions?|parts?)\s+carries\s+(\d+(?:\.\d+)?)\s*marks?/i) ||
      line.match(/^\s*(?:questions?|parts?)\s+carries\s+(\d+(?:\.\d+)?)\s*marks?\.?\s*$/i);
    if (mr) {
      markRules.push({ sectionKey: currentSectionKey, marks: Number(mr[1]), order: qCounter });
    }

    // Optional-question rule detection (anywhere).
    const om =
      line.match(/attempt\s+(?:any\s+)?([a-z]+|\d+)\s+questions?\b/i) ||
      line.match(/(?:choose|select|answer)\s+any\s+([a-z]+|\d+)\s+(?:of\s+the\s+following\s+)?questions?\b/i) ||
      line.match(/any\s+([a-z]+|\d+)\s+of\s+(?:the\s+following\s+)?questions?\b/i);
    if (om) {
      const n = parseCountToken(om[1]);
      if (n !== null) {
        optionalRules.push({ sectionKey: currentSectionKey, pickCount: n, line });
        instructionsLines.push(line); // keep rule text in instructions too
      }
    }

    // "Question N [marks] – title" header (real-paper format).
    const qh = line.match(RE_QUESTION_HEADER);
    if (qh && !/^\d+\.\d+/.test(line)) {
      const num = qh[1];
      const bracketMarks = qh[2] ? Number(qh[2]) : null;
      const rest = (qh[3] || "").trim();
      const { marks: tailMarks, rest: header } = extractMarks(rest);
      lastTopNumber = num;
      startQuestion(num, header || rest, bracketMarks ?? tailMarks, currentSectionKey, false, null);
      continue;
    }

    // Question markers — dotted (1.1) first, then sub (3(a)), then top (3.)
    let qm = line.match(RE_DOT_Q);
    if (qm) {
      const num = `${qm[1]}.${qm[2]}`;
      const { marks: mk, rest: header } = extractMarks(qm[3]);
      startQuestion(num, header, mk, currentSectionKey, true, null);
      continue;
    }
    qm = line.match(RE_SUB_Q);
    if (qm && qm[1] && qm[2] !== undefined) {
      const num = `${qm[1]}(${qm[2].toLowerCase()})`;
      const { marks, rest } = extractMarks(qm[3] || "");
      startQuestion(num, rest, marks, currentSectionKey, false, qm[2].toLowerCase());
      continue;
    }
    // Numbered part "(1) ..." — child of the last top-level question.
    const np = line.match(RE_NUMBERED_PART);
    if (np && lastTopNumber) {
      const { marks, rest } = extractMarks(np[2] || "");
      startQuestion(`${lastTopNumber}.${np[1]}`, rest, marks, currentSectionKey, true, null);
      continue;
    }
    qm = line.match(RE_TOP_Q);
    if (qm) {
      const { marks, rest } = extractMarks(qm[2]);
      lastTopNumber = qm[1];
      startQuestion(qm[1], rest, marks, currentSectionKey, false, null);
      continue;
    }

    // Option line(s) belonging to current question. A line with 2+ option
    // markers ("(a) x (b) y (c) z (d) w") is always MCQ options; a single
    // "(a) ..." is an option only in an MCQ context, otherwise a sub-part.
    const op = line.match(RE_OPTION);
    const cur = current as PendingQ | null;
    const markerCount = (line.match(RE_ANY_OPTION_MARKER) ?? []).length;
    const mcqContext =
      !!cur &&
      (cur.options.length > 0 ||
        /choose the correct|correct answer|which of the|select the/i.test(cur.header));
    if (op && cur && (markerCount >= 2 || mcqContext)) {
      const firstLabel = op[1].toUpperCase();
      const restText = op[2] ?? "";
      // Find every inner option marker ("(B) ", "[C] ", "D) ") in the rest.
      const markerRe = new RegExp(RE_OPTION_INNER.source, "g");
      const hits: Array<{ start: number; end: number; label: string }> = [];
      let mm: RegExpExecArray | null;
      while ((mm = markerRe.exec(restText)) !== null) {
        hits.push({
          start: mm.index,
          end: mm.index + mm[0].length,
          label: mm[1].toUpperCase(),
        });
      }
      const candidates: Array<{ label: string; text: string }> = [];
      if (hits.length === 0) {
        candidates.push({ label: firstLabel, text: restText });
      } else {
        candidates.push({ label: firstLabel, text: restText.slice(0, hits[0].start) });
        for (let hi = 0; hi < hits.length; hi++) {
          const end = hi + 1 < hits.length ? hits[hi + 1].start : restText.length;
          candidates.push({ label: hits[hi].label, text: restText.slice(hits[hi].end, end) });
        }
      }
      for (const cand of candidates) {
        const text = cand.text.trim();
        if (!text) continue;
        if (!cur.options.some((o) => o.label === cand.label)) {
          cur.options.push({ label: cand.label, text });
        }
      }
      continue;
    }

    // Bare "(a) ..." sub-question — inherits the last top-level number.
    // Lowercase letters only reach here (uppercase "(A)" was an option).
    const bq = line.match(RE_BARE_SUB_Q);
    if (bq && lastTopNumber) {
      const letter = bq[1].toLowerCase();
      const { marks, rest } = extractMarks(bq[2] || "");
      startQuestion(`${lastTopNumber}(${letter})`, rest, marks, currentSectionKey, false, letter);
      continue;
    }

    // A line containing only "[N]" is a trailing marks annotation.
    const cont = current as PendingQ | null;
    if (cont && cont.marks === null && /^\[\s*\d{1,3}(?:\.\d+)?\s*\]$/.test(line)) {
      cont.marks = Number(line.replace(/\D/g, ""));
      continue;
    }

    // Wrapped MCQ option continuation: text before the first marker belongs
    // to the previous option; later markers start new options.
    if (cont && cont.options.length > 0) {
      const wrapRe = new RegExp(RE_ANY_OPTION_MARKER.source, "g");
      const hits: Array<{ start: number; end: number; label: string }> = [];
      let wm: RegExpExecArray | null;
      while ((wm = wrapRe.exec(line)) !== null) {
        hits.push({ start: wm.index, end: wm.index + wm[0].length, label: wm[1].toUpperCase() });
      }
      if (hits.length > 0) {
        const before = line.slice(0, hits[0].start).trim();
        if (before && cont.options.length > 0) {
          const last = cont.options[cont.options.length - 1];
          last.text = `${last.text} ${before}`.trim();
        }
        for (let hi = 0; hi < hits.length; hi++) {
          const end = hi + 1 < hits.length ? hits[hi + 1].start : line.length;
          const text = line.slice(hits[hi].end, end).trim();
          const label = hits[hi].label;
          if (text && !cont.options.some((o) => o.label === label)) {
            cont.options.push({ label, text });
          }
        }
        continue;
      }
    }

    // Continuation of current question prompt.
    if (cont) {
      cont.header = `${cont.header}\n${line}`;
      continue;
    }

    // Before the first question: instructions-ish or unparsed.
    if (!inInstructions && finished.length === 0 && !current) {
      if (line.length > 30 && /[a-zA-Z]{4,}/.test(line) && !/^(time|date|class|subject|maximum|total)/i.test(line)) {
        unparsedBlocks.push(line.slice(0, 300));
      }
    }
  }
  flushCurrent();

  if (instructionsLines.length > 0) {
    meta.instructions = instructionsLines.join("\n").trim().slice(0, 8000) || null;
  }

  // --- Infer marks BEFORE collapse so parent/child sums compare correctly -
  const inferredMarks = new Map<PendingQ, number>();
  for (const q of finished) {
    if (q.marks !== null) continue;
    const rule = [...markRules]
      .filter((r) => r.sectionKey === q.sectionKey && r.order <= q.order)
      .sort((a, b) => b.order - a.order)[0];
    if (rule) {
      q.marks = rule.marks;
      inferredMarks.set(q, rule.marks);
    }
  }

  // --- Post-process: collapse parent/sub-question duplication -------------
  // If a top-level question has marked sub-parts whose marks sum to the
  // parent's marks, keep only the sub-parts (parent stem prepended).
  const bySectionOrder = [...finished].sort((a, b) => a.order - b.order);
  const parentOf = new Map<string, PendingQ>(); // "3" -> PendingQ
  const childrenOf = new Map<string, PendingQ[]>();
  for (const q of bySectionOrder) {
    if (q.sub === null && !q.dotted) {
      parentOf.set(q.number, q);
    } else {
      const parentNum = q.dotted ? q.number.split(".")[0] : q.number.split("(")[0];
      const arr = childrenOf.get(parentNum) ?? [];
      arr.push(q);
      childrenOf.set(parentNum, arr);
    }
  }
  // Sections governed by an "attempt any N" rule keep top-level questions
  // as single rows — sub-parts are merged into the parent prompt so group
  // membership stays at question granularity (students pick whole questions).
  const optionalSectionKeys = new Set(optionalRules.map((r) => r.sectionKey));
  const dropIds = new Set<PendingQ>();
  for (const [pnum, parent] of parentOf) {
    const kids = childrenOf.get(pnum);
    if (!kids || kids.length === 0) continue;
    if (optionalSectionKeys.has(parent.sectionKey)) {
      // Merge sub-part text into the parent and drop the separate rows.
      const extra = kids.map((k) => k.header.split("\n")[0]).join("\n");
      parent.header = `${parent.header}\n${extra}`;
      for (const k of kids) dropIds.add(k);
      continue;
    }
    const kidMarks = kids.map((k) => k.marks);
    const allMarked = kidMarks.every((m) => m !== null);
    const sum = kidMarks.reduce<number>((a, b) => a + (b ?? 0), 0);
    if (allMarked && parent.marks !== null && Math.abs(sum - parent.marks) < 0.001) {
      // Collapse: prepend the full parent stem to each child for context.
      for (const k of kids) {
        k.header = `${parent.header}\n${k.header}`;
      }
      dropIds.add(parent);
    } else if (allMarked && parent.marks !== null) {
      warnings.push(
        `Question ${pnum}: sub-parts sum to ${sum} marks but the question shows ${parent.marks} — review which rows to keep.`
      );
    }
  }
  const kept = bySectionOrder.filter((q) => !dropIds.has(q));

  // --- Type detection -------------------------------------------------------
  const detectType = (q: PendingQ): { type: PaperQuestionType; warn?: string } => {
    const text = q.header.toLowerCase();
    if (q.options.length >= 2) return { type: "mcq" };
    if (/program|write a java|java program|coding|implement\b/.test(text)) return { type: "program" };
    if (/predict the output|output of the|what is the output|find the output/.test(text)) return { type: "output" };
    if (q.marks !== null && q.marks <= 2) return { type: "short_answer" };
    if (/\b(define|state|give one|name the|differentiate|list|what is|who|when|where|short note|explain in brief)\b/.test(text)) {
      return { type: "short_answer" };
    }
    return { type: "theory" };
  };

  // --- Build draft questions -------------------------------------------------
  const sectionKeySet = new Set(sections.map((s) => s.key));
  for (const q of kept) {
    const sectionKey = sectionKeySet.has(q.sectionKey) ? q.sectionKey : sections[0].key;
    const { type, warn } = detectType(q);
    const qw: string[] = [];
    if (q.marks === null) qw.push("No marks detected — set marks manually.");
    const inferred = inferredMarks.get(q);
    if (inferred !== undefined) qw.push(`Marks inferred from paper instruction (${inferred}) — verify.`);
    if (warn) qw.push(warn);
    if (q.options.length === 1) qw.push("Only one MCQ option detected — add the rest manually.");
    if (q.options.length > 10) qw.push("More than 10 options detected — review.");
    questions.push({
      key: nextKey("q"),
      section_key: sectionKey,
      optional_group_key: null,
      question_number: q.number,
      prompt: q.header.trim().slice(0, 20000),
      question_type: type,
      marks: q.marks,
      options: q.options.slice(0, 10),
      warnings: qw,
    });
  }

  // --- Optional groups --------------------------------------------------------
  const optional_groups: DraftOptionalGroup[] = [];
  const groupBySection = new Map<string, DraftOptionalGroup>();
  for (const rule of optionalRules) {
    const existing = groupBySection.get(rule.sectionKey);
    if (existing) {
      warnings.push(`Multiple "attempt any" rules found for one section — only the first was used: "${rule.line}"`);
      continue;
    }
    const g: DraftOptionalGroup = {
      key: nextKey("g"),
      title: `Attempt any ${rule.pickCount} questions`,
      pick_count: rule.pickCount,
      max_counted_marks: 0, // computed below
      order_index: optional_groups.length,
    };
    optional_groups.push(g);
    groupBySection.set(rule.sectionKey, g);
    // Mark member questions (same section, numbered questions).
    for (const q of questions) {
      if (q.section_key === rule.sectionKey) q.optional_group_key = g.key;
    }
  }
  // Compute max_counted_marks = sum of the pick_count highest member marks.
  for (const g of optional_groups) {
    const members = questions.filter((q) => q.optional_group_key === g.key);
    const marks = members.map((q) => q.marks ?? 0).sort((a, b) => b - a);
    const top = marks.slice(0, g.pick_count).reduce((a, b) => a + b, 0);
    g.max_counted_marks = Math.round(top * 100) / 100;
    if (members.length < g.pick_count) {
      warnings.push(`Optional group "${g.title}" has only ${members.length} questions but requires ${g.pick_count}.`);
    }
    if (members.some((q) => q.marks === null)) {
      warnings.push(`Optional group "${g.title}" has questions with no detected marks — set them before saving.`);
    }
  }

  // Sections with no questions → warning.
  for (const s of sections) {
    if (!questions.some((q) => q.section_key === s.key)) {
      warnings.push(`Section "${s.title}" has no questions — remove it or add questions.`);
    }
  }
  // Drop the placeholder section if a real first section replaced it and it has no questions.
  const finalSections = sections.filter(
    (s, i) => !(i === 0 && s.title === "Section A" && sections.length > 1 && !questions.some((q) => q.section_key === s.key))
  );
  if (finalSections.length === 0) {
    finalSections.push({ key: "sec-a", title: "Section A", order_index: 0 });
  }
  // Re-key questions pointing at a dropped section.
  const validKeys = new Set(finalSections.map((s) => s.key));
  for (const q of questions) {
    if (!validKeys.has(q.section_key)) q.section_key = finalSections[0].key;
  }

  const noMarks = questions.filter((q) => q.marks === null).length;
  if (noMarks > 0) {
    warnings.push(`${noMarks} question(s) have no detected marks — set them manually before saving.`);
  }
  const confidence: ExamDraft["confidence"] =
    questions.length === 0
      ? "low"
      : noMarks === 0 && warnings.length === 0
        ? "high"
        : noMarks <= Math.max(1, questions.length / 5) && warnings.length <= 3
          ? "medium"
          : "low";

  if (questions.length === 0) {
    warnings.push("No questions were detected — the paper layout may be unusual. Add questions manually.");
  }

  return {
    meta,
    sections: finalSections,
    optional_groups,
    questions,
    warnings: [...new Set(warnings)],
    unparsedBlocks: unparsedBlocks.slice(0, 20),
    confidence,
  };
}
