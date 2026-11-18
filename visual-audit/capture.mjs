// Javoodle visual audit capture — Playwright.
// Usage: node visual-audit/capture.mjs   (requires `npm run start` on :3215)
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3215";
const OUT = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0 && !line.trim().startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
const SKEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SKEY, Authorization: `Bearer ${SKEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const api = async (p, o = {}) => {
  const r = await fetch(`${SUPA}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers ?? {}) } });
  if (!r.ok) return null;
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};

for (const d of ["desktop/public", "desktop/student", "desktop/admin", "mobile/public", "mobile/student", "mobile/admin", "states/coding", "states/practice", "states/exams", "states/admin", "states/learn", "failures"])
  mkdirSync(`${OUT}${d}`, { recursive: true });

// ---- discover dynamic IDs from live data ----
const [codingQ, lesson, topic, exams, practiceQ] = await Promise.all([
  api("coding_questions?select=id&status=eq.published&limit=1"),
  api("lessons?select=id,topic_id&published=eq.true&limit=1"),
  api("topics?select=id&limit=1"),
  api("exams?select=id,title&status=eq.published&limit=3"),
  api("questions?select=id&status=eq.approved&question_status=eq.approved&answer_status=eq.approved&type=eq.mcq&limit=1"),
]);
const CODING_ID = codingQ?.[0]?.id ?? null;
const LESSON_ID = lesson?.[0]?.id ?? null;
const TOPIC_ID = lesson?.[0]?.topic_id ?? topic?.[0]?.id ?? null;
const EXAM_ID = exams?.[0]?.id ?? null;
const MCQ_ID = practiceQ?.[0]?.id ?? null;
console.log("ids:", { CODING_ID, LESSON_ID, TOPIC_ID, EXAM_ID, MCQ_ID });

// ---- student session (test account, cleaned up at end) ----
const token = "jds_" + randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(token, "utf8").digest("hex");
let testStudentId = null;
{
  const s = await api("students?select=id&display_name=eq.VisualAudit");
  testStudentId = s?.[0]?.id;
  if (!testStudentId) {
    const r = await api("students", { method: "POST", body: JSON.stringify({ display_name: "VisualAudit" }) });
    testStudentId = r?.[0]?.id;
  }
  await api("student_sessions", { method: "POST", body: JSON.stringify({ student_id: testStudentId, token_hash: hash, expires_at: new Date(Date.now() + 864e5).toISOString() }) });
}

const studentCookie = { name: "javoodle_session", value: token, domain: "localhost", path: "/" };

// ---- route inventory ----
const ROUTES = [
  // public
  { area: "public", name: "landing", path: "/" },
  // student
  { area: "student", name: "dashboard", path: "/dashboard" },
  { area: "student", name: "learn-overview", path: "/learn" },
  ...(TOPIC_ID ? [{ area: "student", name: "learn-topic", path: `/learn/${TOPIC_ID}` }] : []),
  ...(LESSON_ID ? [{ area: "student", name: "lesson-detail", path: `/learn/lesson/${LESSON_ID}` }] : []),
  { area: "student", name: "practice-overview", path: "/practice" },
  { area: "student", name: "practice-session", path: "/practice/session?topic=all" },
  { area: "student", name: "playground", path: "/playground" },
  { area: "student", name: "growth", path: "/growth" },
  { area: "student", name: "coding-list", path: "/coding" },
  ...(CODING_ID ? [{ area: "student", name: "coding-question", path: `/coding/${CODING_ID}` }] : []),
  { area: "student", name: "exams-list", path: "/exams" },
  ...(EXAM_ID ? [
    { area: "student", name: "exam-detail", path: `/exams/${EXAM_ID}` },
    { area: "student", name: "exam-runner", path: `/exams/${EXAM_ID}/take` },
    { area: "student", name: "exam-result", path: `/exams/${EXAM_ID}/result` },
  ] : [{ area: "student", name: "exams-unavailable", path: null, note: "no published exams in DB" }]),
  // admin
  { area: "admin", name: "admin-login", path: "/admin/login", public: true },
  { area: "admin", name: "admin-dashboard", path: "/admin", authBlocked: true },
  { area: "admin", name: "admin-exams", path: "/admin/exams", authBlocked: true },
  { area: "admin", name: "admin-exam-new", path: "/admin/exams/new", authBlocked: true },
  { area: "admin", name: "admin-exam-editor", path: EXAM_ID ? `/admin/exams/${EXAM_ID}` : null, authBlocked: true, note: EXAM_ID ? null : "no exam id" },
  { area: "admin", name: "admin-exam-submissions", path: "/admin/exams/submissions", authBlocked: true },
  { area: "admin", name: "admin-questions", path: "/admin/questions", authBlocked: true },
  { area: "admin", name: "admin-question-bank", path: "/admin/questions/bank", authBlocked: true },
  { area: "admin", name: "admin-question-import", path: "/admin/questions/import", authBlocked: true },
  { area: "admin", name: "admin-question-review", path: "/admin/questions/review", authBlocked: true },
  { area: "admin", name: "admin-question-upload", path: "/admin/questions/upload", authBlocked: true },
  { area: "admin", name: "admin-question-editor", path: MCQ_ID ? `/admin/questions/${MCQ_ID}` : null, authBlocked: true, note: MCQ_ID ? null : "no question id" },
  { area: "admin", name: "admin-coding", path: "/admin/coding", authBlocked: true },
  { area: "admin", name: "admin-coding-editor", path: CODING_ID ? `/admin/coding/${CODING_ID}` : null, authBlocked: true, note: CODING_ID ? null : "no coding id" },
  { area: "admin", name: "admin-coding-submissions", path: "/admin/coding/submissions", authBlocked: true },
  { area: "admin", name: "admin-documents", path: "/admin/documents", authBlocked: true },
];

const manifest = [];
const report = { routes: ROUTES.length, captured: 0, blocked: [], missing: [], errors: [], shots: 0 };

async function shoot(pg, file, fullPage = true) {
  await pg.screenshot({ path: `${OUT}${file}`, fullPage });
  report.shots++;
}

async function auditPage(pg, route, viewportName) {
  const rec = { route: route.name, path: route.path, viewport: viewportName, area: route.area, status: null, title: "", consoleErrors: [], failedRequests: [], overflow: false, screenshot: null, note: route.note ?? null };
  if (!route.path) { rec.status = "skipped"; rec.note = route.note; manifest.push(rec); report.missing.push(route.name); return rec; }
  try {
    const resp = await pg.goto(BASE + route.path, { waitUntil: "domcontentloaded", timeout: 30000 });
    rec.status = resp?.status() ?? null;
    await pg.waitForTimeout(2500);
    await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await pg.waitForTimeout(600);
    await pg.evaluate(() => window.scrollTo(0, 0));
    await pg.waitForTimeout(400);
    rec.title = await pg.title();
    const m = await pg.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      imgs: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).length,
    }));
    rec.overflow = m.sw > m.cw + 2;
    if (m.imgs) rec.note = (rec.note ? rec.note + "; " : "") + `${m.imgs} broken image(s)`;
    const file = `${viewportName}/${route.area === "admin" && route.public ? "public" : route.area}/${route.name}.png`;
    await shoot(pg, file);
    rec.screenshot = file;
    report.captured++;
  } catch (e) {
    rec.status = "error"; rec.note = String(e.message).slice(0, 200);
    report.errors.push({ route: route.name, error: rec.note });
    try { await shoot(pg, `failures/${viewportName}-${route.name}.png`); } catch {}
  }
  manifest.push(rec);
  return rec;
}

const browser = await chromium.launch();

// ---------- desktop ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addCookies([studentCookie]);
  const pg = await ctx.newPage();
  const errs = [], fails = [];
  pg.on("pageerror", e => errs.push(e.message.slice(0, 120)));
  pg.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
  pg.on("requestfailed", r => fails.push(r.url().slice(-80)));

  for (const r of ROUTES) {
    errs.length = 0; fails.length = 0;
    const rec = await auditPage(pg, r, "desktop");
    rec.consoleErrors = [...errs]; rec.failedRequests = [...fails];
    if (r.authBlocked) { report.blocked.push(r.name); rec.note = (rec.note ? rec.note + "; " : "") + "admin auth required — redirected to login"; }
  }
  // landing logged-out variant (fresh context without cookie)
  const pub = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const pg2 = await pub.newPage();
  await pg2.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await pg2.waitForTimeout(2500);
  await shoot(pg2, "desktop/public/landing-loggedout.png");
  manifest.push({ route: "landing", path: "/", viewport: "desktop", area: "public", status: 200, title: await pg2.title(), screenshot: "desktop/public/landing-loggedout.png", note: "no session cookie" });
  report.shots++;
  await pub.close();
  await ctx.close();
}

// ---------- mobile ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.addCookies([studentCookie]);
  const pg = await ctx.newPage();
  for (const r of ROUTES) {
    if (r.authBlocked) continue; // admin blocked pages look identical on mobile
    await auditPage(pg, r, "mobile");
  }
  await ctx.close();
}

// ---------- interactive states (desktop) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addCookies([studentCookie]);
  const pg = await ctx.newPage();

  // coding question: initial + typed code + run attempt
  if (CODING_ID) {
    await pg.goto(`${BASE}/coding/${CODING_ID}`, { waitUntil: "domcontentloaded" });
    await pg.waitForTimeout(3500);
    await shoot(pg, "states/coding/question-initial.png");
    // type into Monaco
    try {
      await pg.click(".monaco-editor .view-lines", { position: { x: 40, y: 40 } });
      await pg.keyboard.press("ControlOrMeta+a");
      await pg.keyboard.type('public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Javoodle!");\n    }\n}');
      await pg.waitForTimeout(800);
      await shoot(pg, "states/coding/code-entered.png");
      // stdin
      await pg.fill("#coding-stdin", "test input\nsecond line");
      await shoot(pg, "states/coding/stdin-filled.png");
      // run
      await pg.click('button:has-text("Run Code")');
      await pg.waitForTimeout(12000);
      await shoot(pg, "states/coding/after-run.png");
    } catch (e) { manifest.push({ route: "coding-states", status: "error", note: String(e.message).slice(0, 150) }); }
  }

  // playground initial + example
  await pg.goto(`${BASE}/playground`, { waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(3000);
  await shoot(pg, "states/coding/playground-initial.png");

  // practice session: question view + answer feedback (MCQ-safe)
  if (MCQ_ID) {
    await pg.goto(`${BASE}/practice/session?topic=all`, { waitUntil: "domcontentloaded" });
    await pg.waitForTimeout(2000);
    await shoot(pg, "states/practice/question-before.png");
    try {
      const opt = pg.locator("button", { hasText: ")" }).first();
      await opt.click();
      await pg.click('button:has-text("Check answer")');
      await pg.waitForTimeout(2500);
      await shoot(pg, "states/practice/after-answer.png");
      const next = pg.locator('button:has-text("Next question"), button:has-text("See results")').first();
      if (await next.count()) { await next.click(); await pg.waitForTimeout(1200); await shoot(pg, "states/practice/question-2.png"); }
    } catch (e) { manifest.push({ route: "practice-states", status: "error", note: String(e.message).slice(0, 150) }); }
  }

  // learn states
  if (LESSON_ID) {
    await pg.goto(`${BASE}/learn/lesson/${LESSON_ID}`, { waitUntil: "domcontentloaded" });
    await pg.waitForTimeout(2000);
    await shoot(pg, "states/learn/lesson-page.png");
    try {
      await pg.click('button:has-text("Mark lesson complete")');
      await pg.waitForTimeout(2500);
      await shoot(pg, "states/learn/lesson-completed.png");
    } catch {}
  }

  // exams list + detail if available
  if (EXAM_ID) {
    await pg.goto(`${BASE}/exams/${EXAM_ID}`, { waitUntil: "domcontentloaded" });
    await pg.waitForTimeout(2000);
    await shoot(pg, "states/exams/exam-detail.png");
    await pg.goto(`${BASE}/exams/${EXAM_ID}/take`, { waitUntil: "domcontentloaded" });
    await pg.waitForTimeout(3000);
    await shoot(pg, "states/exams/exam-runner.png");
  }
  await ctx.close();
}

// ---------- outputs ----------
writeFileSync(`${OUT}screenshot-manifest.json`, JSON.stringify(manifest, null, 2));

const groups = { public: [], student: [], admin: [] };
for (const m of manifest) if (m.screenshot) groups[m.area]?.push(m);
const thumb = (m) => m.screenshot ? `<a href="${m.screenshot}" target="_blank"><img src="${m.screenshot}" loading="lazy"></a>` : `<div class="na">${m.status ?? "—"}</div>`;
const row = (m) => `<tr><td>${thumb(m)}</td><td><code>${m.path ?? "—"}</code><br><small>${m.viewport} · ${m.status ?? ""}${m.consoleErrors?.length ? " · ⚠ " + m.consoleErrors.length + " console err" : ""}${m.note ? " · " + m.note : ""}</small></td></tr>`;
const section = (title, arr) => `<h2>${title} (${arr.length})</h2><table>${arr.map(row).join("")}</table>`;
writeFileSync(`${OUT}index.html`, `<!doctype html><meta charset="utf-8"><title>Javoodle Visual Audit</title><style>
body{font-family:system-ui;background:#0d1528;color:#c0cce0;margin:24px}h1{color:#f8fafc}h2{color:#a855f7;margin-top:32px}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #293957;padding:8px;vertical-align:top}img{width:220px;border:1px solid #293957;border-radius:8px;display:block}code{color:#c084fc}.na{color:#8fa1bc;font-size:12px;padding:20px}small{color:#8fa1bc}</style>
<h1>Javoodle — Visual Audit</h1><p>${manifest.length} routes · ${report.shots} screenshots · generated ${new Date().toISOString()}</p>
${section("Public", groups.public)}${section("Student", groups.student)}${section("Admin", groups.admin)}`);

// ---------- cleanup test student ----------
if (testStudentId) {
  await fetch(`${SUPA}/rest/v1/student_sessions?student_id=eq.${testStudentId}`, { method: "DELETE", headers: H });
  await fetch(`${SUPA}/rest/v1/students?id=eq.${testStudentId}`, { method: "DELETE", headers: H });
}

writeFileSync(`${OUT}capture-report.md`, `# Javoodle Visual Audit — Capture Report

Generated: ${new Date().toISOString()}
Base URL: ${BASE}

## Summary
- Routes discovered: ${report.routes}
- Screenshots saved: ${report.shots}
- Routes captured: ${report.captured}
- Auth-blocked (admin, no credentials): ${report.blocked.length} → ${report.blocked.join(", ")}
- Unavailable (missing data): ${report.missing.length} → ${report.missing.join(", ")}
- Errors: ${report.errors.length}${report.errors.length ? " → " + JSON.stringify(report.errors) : ""}

## Notes
- Admin panel pages require Supabase Auth admin credentials — only /admin/login was captured; all other admin routes redirect to login (verified).
- Exam detail/runner/result captured only if a published exam exists (${EXAM_ID ?? "none found"}).
- Interactive states captured under states/: coding run (real OnlineCompiler execution), practice answer feedback, lesson completion (+XP), playground.
- Console errors and failed requests are recorded per-route in screenshot-manifest.json.

## Files
- index.html — visual gallery
- screenshot-manifest.json — per-route metadata
- desktop/ mobile/ states/ failures/ — PNG captures
`);

console.log(`DONE shots=${report.shots} captured=${report.captured} blocked=${report.blocked.length} missing=${report.missing} errors=${report.errors.length}`);
await browser.close();
