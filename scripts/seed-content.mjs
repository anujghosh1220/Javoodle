#!/usr/bin/env node
/**
 * Javoodle curriculum seeder — idempotent.
 *
 * Inserts into the LIVE Supabase project (via service role from .env.local):
 *   1. The "Java Playground" sandbox coding_question (topic __playground_sandbox__)
 *   2. Published lessons for every seeded topic (blocks jsonb)
 *   3. Approved practice questions + MCQ options
 *
 * Safe to re-run: existing rows are matched and skipped, never duplicated.
 *
 * Usage:  node scripts/seed-content.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lessonsP1 } from "./curriculum/lessons-p1.mjs";
import { lessonsP2 } from "./curriculum/lessons-p2.mjs";
import { lessonsP3 } from "./curriculum/lessons-p3.mjs";
import { practiceQuestions } from "./curriculum/questions.mjs";

// Keep in sync with lib/coding/shared.ts (node can't import .ts directly).
const PLAYGROUND = {
  topic: "__playground_sandbox__",
  title: "Java Playground",
  starter: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter your name: ");\n        String name = sc.nextLine();\n        System.out.println("Hello, " + name + "!");\n    }\n}\n`,
};

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0 && !line.trim().startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function api(path, opts = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.method === "POST" ? "return=representation" : undefined,
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${opts.method ?? "GET"} ${path} → ${res.status}: ${body.slice(0, 300)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

// Canonical JSON for comparing jsonb (Postgres reorders object keys).
const canonDeep = (v) =>
  Array.isArray(v) ? `[${v.map(canonDeep).join(",")}]`
  : v && typeof v === "object"
    ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonDeep(v[k])}`).join(",")}}`
    : JSON.stringify(v);

// Parse topic tuples from supabase/seed.sql — single source of truth for the syllabus list.
function parseSeedTopics() {
  const sql = readFileSync(join(import.meta.dirname, "..", "supabase", "seed.sql"), "utf8");
  const out = [];
  const re = /\('((?:[^'\\]|\\.)*)',\s*(\d+),\s*(\d+),\s*'((?:[^'\\]|\\.)*)'\)/g;
  let m;
  while ((m = re.exec(sql))) {
    out.push({ name: m[1].replace(/\\'/g, "'"), phase: +m[2], order_index: +m[3], description: m[4].replace(/\\'/g, "'") });
  }
  return out;
}

async function main() {
  console.log("== Javoodle curriculum seed ==\n");

  // ---------- 0. Topics (upsert from seed.sql) ----------
  const seedTopics = parseSeedTopics();
  let topics = await api("topics?select=id,name,phase,order_index,description");
  const topicByName = new Map(topics.map((t) => [t.name, t]));
  for (const t of seedTopics) {
    const ex = topicByName.get(t.name);
    if (!ex) {
      const [row] = await api("topics", { method: "POST", body: JSON.stringify(t) });
      topics.push(row);
      topicByName.set(t.name, row);
      console.log(`+ topic created: ${t.name}`);
    } else if (ex.phase !== t.phase || ex.order_index !== t.order_index || ex.description !== t.description) {
      await api(`topics?id=eq.${ex.id}`, { method: "PATCH", body: JSON.stringify({ phase: t.phase, order_index: t.order_index, description: t.description }) });
      console.log(`~ topic updated: ${t.name} (order ${ex.order_index} → ${t.order_index})`);
    }
  }
  console.log(`topics: ${topics.length}`);

  // ---------- 1. Playground sandbox question ----------
  const existingPlayground = await api(`coding_questions?select=id&topic=eq.${PLAYGROUND.topic}&limit=1`);
  if (existingPlayground.length === 0) {
    await api("coding_questions", {
      method: "POST",
      body: JSON.stringify([{
        title: PLAYGROUND.title,
        description: "Free sandbox — write any Java program and run it. Nothing is graded or submitted.",
        problem_statement: "Experiment with Java: variables, loops, Scanner input, arrays, anything.",
        input_format: "Optional — depends on your program.",
        output_format: "Whatever your program prints.",
        constraints: "",
        hints: "Try the example programs in the Playground toolbar.",
        starter_code: PLAYGROUND.starter,
        marks: 1,
        difficulty: "easy",
        topic: PLAYGROUND.topic,
        status: "published",
      }]),
    });
    console.log("✓ playground sandbox question created");
  } else {
    console.log("• playground sandbox question already exists");
  }

  // ---------- 2. Lessons ----------
  const existingLessons = await api("lessons?select=id,title,topic_id,blocks,order_index");
  const lessonByKey = new Map(existingLessons.map((l) => [`${l.topic_id}|${norm(l.title)}`, l]));
  let lessonInserts = [];
  const lessonUpdateJobs = [];
  const allLessonData = [...lessonsP1, ...lessonsP2, ...lessonsP3];
  for (const group of allLessonData) {
    const topic = topicByName.get(group.topic);
    if (!topic) { console.warn(`! topic not found: ${group.topic}`); continue; }
    group.lessons.forEach((les, i) => {
      const key = `${topic.id}|${norm(les.title)}`;
      const ex = lessonByKey.get(key);
      if (ex) {
        // Refresh content when the source lesson changed (safe: progress keys on lesson id).
        if (canonDeep(ex.blocks) !== canonDeep(les.blocks) || ex.order_index !== i + 1) {
          lessonUpdateJobs.push(api(`lessons?id=eq.${ex.id}`, { method: "PATCH", body: JSON.stringify({ blocks: les.blocks, order_index: i + 1, published: true }) }));
        }
        return;
      }
      lessonInserts.push({
        topic_id: topic.id,
        title: les.title,
        blocks: les.blocks,
        order_index: i + 1,
        published: true,
      });
    });
  }
  if (lessonUpdateJobs.length) {
    await Promise.all(lessonUpdateJobs);
    console.log(`✓ ${lessonUpdateJobs.length} lessons refreshed`);
  }
  if (lessonInserts.length) {
    for (let i = 0; i < lessonInserts.length; i += 50) {
      await api("lessons", { method: "POST", body: JSON.stringify(lessonInserts.slice(i, i + 50)) });
    }
    console.log(`✓ ${lessonInserts.length} lessons inserted`);
  } else {
    console.log("• no new lessons");
  }

  // ---------- 3. Practice questions ----------
  const existingQuestions = await api("questions?select=id,text,topic_id,type");
  const qKeys = new Set(existingQuestions.map((q) => `${q.topic_id ?? ""}|${q.type}|${norm(q.text).slice(0, 80)}`));
  let qInserts = [];
  for (const qq of practiceQuestions) {
    const topic = topicByName.get(qq.topic);
    if (!topic) { console.warn(`! topic not found for question: ${qq.topic}`); continue; }
    const key = `${topic.id}|${qq.type}|${norm(qq.text).slice(0, 80)}`;
    if (qKeys.has(key)) continue;
    qInserts.push({
      topic_id: topic.id,
      type: qq.type,
      text: qq.text,
      marks: qq.marks,
      difficulty: qq.difficulty,
      status: "approved",
      question_status: "approved",
      answer_status: "approved",
      correct_answer_text: qq.type === "mcq" ? null : qq.answer,
      explanation: qq.explanation,
      provenance: { seed: "javoodle-curriculum-v1", authored: "Javoodle original content" },
      version: 1,
    });
    if (qq.type === "mcq" && Array.isArray(qq.options)) {
      // options attached after insert via index bookkeeping below
      qInserts[qInserts.length - 1]._options = qq.options;
    }
  }
  console.log(`questions to insert: ${qInserts.length}`);
  for (let i = 0; i < qInserts.length; i += 50) {
    const chunk = qInserts.slice(i, i + 50).map((m) => {
      const row = { ...m };
      delete row._options;
      return row;
    });
    await api("questions", { method: "POST", body: JSON.stringify(chunk) });
  }
  if (qInserts.length) console.log(`✓ ${qInserts.length} practice questions inserted`);

  // ---------- 3b. MCQ options (matched by question text — idempotent) ----------
  const mcqRows = await api("questions?select=id,text&status=eq.approved&type=eq.mcq");
  const existingOpts = await api(`question_options?select=question_id&question_id=in.(${mcqRows.map((r) => r.id).join(",")})`);
  const hasOpts = new Set(existingOpts.map((o) => o.question_id));
  const qByText = new Map(practiceQuestions.filter((q) => q.type === "mcq").map((q) => [norm(q.text).slice(0, 80), q]));
  const missing = mcqRows.filter((r) => !hasOpts.has(r.id));
  let optionRows = [];
  for (const r of missing) {
    const src = qByText.get(norm(r.text).slice(0, 80));
    if (!src?.options) { console.warn(`! no option source for MCQ: ${r.text.slice(0, 50)}`); continue; }
    src.options.forEach((o, k) => {
      optionRows.push({ question_id: r.id, label: o.label, text: o.text, is_correct: o.is_correct, order_index: k });
    });
  }
  for (let i = 0; i < optionRows.length; i += 100) {
    await api("question_options", { method: "POST", body: JSON.stringify(optionRows.slice(i, i + 100)) });
  }
  console.log(`✓ ${optionRows.length} MCQ options ensured (${missing.length} questions checked)`);

  console.log("\nDone. Verify at /learn, /practice and /playground.");
}

main().catch((e) => { console.error(e); process.exit(1); });
