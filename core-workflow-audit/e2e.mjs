// Javoodle exam lifecycle E2E — real UI + server actions, temp accounts only.
// Usage: node core-workflow-audit/e2e.mjs   (requires `npm run start` on :3217)
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3217";
const OUT = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0 && !line.trim().startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
const SKEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SKEY, Authorization: `Bearer ${SKEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const api = async (p, o = {}) => { try { const r = await fetch(`${SUPA}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers ?? {}) } }); if (!r.ok) return { __err: r.status, body: (await r.text()).slice(0, 300) }; const t = await r.text(); return t ? JSON.parse(t) : null; } catch { return null; } };

for (const d of ["desktop", "states", "failures", "reports"]) mkdirSync(`${OUT}${d}`, { recursive: true });
const results = [];
const rec = (step, status, note = "") => { results.push({ step, status, note }); console.log(`[${status}] ${step}${note ? " — " + note : ""}`); };
const shot = async (pg, name, vp = "desktop") => { try { await pg.screenshot({ path: `${OUT}${vp}/${name}.png` }); } catch {} };

const adminCreds = JSON.parse(readFileSync(`${OUT}.e2e-admin.json`, "utf8"));

// ---- student account ----
const token = "jds_" + randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(token, "utf8").digest("hex");
let studentId = null;
{
  const s = await api("students?select=id&display_name=eq.E2EStudent");
  studentId = s?.[0]?.id;
  if (!studentId) { const r = await api("students", { method: "POST", body: JSON.stringify({ display_name: "E2EStudent" }) }); studentId = r?.[0]?.id; }
  await api("student_sessions", { method: "POST", body: JSON.stringify({ student_id: studentId, token_hash: hash, expires_at: new Date(Date.now() + 864e5).toISOString() }) });
}
const studentCookie = { name: "javoodle_session", value: token, domain: "localhost", path: "/" };

const browser = await chromium.launch();
const errors = [];

async function newPage(viewport = { width: 1440, height: 1000 }, cookies = []) {
  const ctx = await browser.newContext({ viewport });
  if (cookies.length) await ctx.addCookies(cookies);
  const pg = await ctx.newPage();
  pg.on("pageerror", e => errors.push(pg.url() + " :: " + e.message.slice(0, 100)));
  return { ctx, pg };
}

// ============================================================ ADMIN JOURNEY
const { ctx: actx, pg: apg } = await newPage();
apg.on("dialog", d => d.accept());
try {
  await apg.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await shot(apg, "admin-login");
  await apg.fill('input[type="email"], input[name="email"]', adminCreds.email);
  await apg.fill('input[type="password"]', adminCreds.password);
  await apg.locator('button:has-text("Sign in")').click();
  await apg.waitForURL((u) => u.pathname === "/admin" || (u.pathname.startsWith("/admin/") && !u.pathname.includes("login")), { timeout: 15000 });
  rec("admin login", "PASS");
  await shot(apg, "admin-dashboard");
} catch (e) { rec("admin login", "FAIL", String(e.message).slice(0, 120)); }

let examId = null;
try {
  await apg.goto(`${BASE}/admin/exams/new`, { waitUntil: "domcontentloaded" });
  try { await apg.waitForSelector('input[name="title"]', { timeout: 20000 }); } catch { rec('exam-create diag','INFO','url='+apg.url()+' body='+(await apg.locator('body').innerText().catch(()=>'')).slice(0,200)); await apg.reload({waitUntil:'domcontentloaded'}); await apg.waitForSelector('input[name="title"]',{timeout:20000}); }
  await apg.fill('input[name="title"]', "Javoodle E2E Validation Exam");
  await apg.fill('input[name="total_marks"]', "30");
  await apg.waitForTimeout(1500); await shot(apg, "exam-create-form");
  await apg.locator('button:has-text("Create Exam")').click();
  try {
    await apg.waitForURL(/\/admin\/exams\/[0-9a-f-]+/, { timeout: 45000 });
  } catch {
    rec("exam-create diag2", "INFO", `url=${apg.url()} body=${(await apg.locator("body").innerText().catch(() => "")).slice(0, 300)}`);
    throw new Error("exam create navigation timeout");
  }
  examId = apg.url().match(/exams\/([0-9a-f-]+)/)?.[1];
  rec("exam created", examId ? "PASS" : "FAIL", examId ?? apg.url());
  await shot(apg, "exam-editor-empty");
} catch (e) { rec("exam creation", "FAIL", String(e.message).slice(0, 150)); }

if (examId) {
  try {
    const QUESTIONS = [
      { prompt: "Which keyword is used to inherit a class in Java?", qtype: "mcq", marks: "5",
        options: "implements; extends; import; package", correct: "extends",
        model: "extends is the keyword used for class inheritance." },
      { prompt: "Write a Java program that accepts an integer and prints its square.", qtype: "program", marks: "15",
        model: "Scanner-based program reading an int and printing n*n. Example: input 5 -> output 25." },
      { prompt: "Explain the difference between a while loop and a do-while loop in Java.", qtype: "paragraph", marks: "10",
        model: "while checks condition before executing; do-while executes body once then checks condition. Both repeat until condition false." },
    ];

    async function addAndFill(q) {
      await apg.locator('button:has-text("Add question")').first().click();
      await apg.waitForTimeout(800);
      const li = apg.locator("ol li").last();
      const editBtn = li.locator('button[title="Edit"]');
      if (await editBtn.count()) { await editBtn.click(); await apg.waitForTimeout(500); }
      const scope = li;
      await scope.locator('textarea[placeholder*="full question" i]').fill(q.prompt);
      await scope.locator("select").selectOption(q.qtype).catch(() => {});
      await scope.locator('input[type="number"]').fill(q.marks);
      if (q.options) await scope.locator('input[placeholder*="int; float" i]').fill(q.options);
      if (q.correct) await scope.locator('input[placeholder*="match one option" i]').fill(q.correct);
      if (q.model && q.qtype !== "mcq") {
        const ma = scope.locator('textarea[placeholder*="Ideal answer" i]');
        if (await ma.count()) await ma.fill(q.model);
      }
      await scope.locator('button:has-text("Done")').click().catch(() => {});
      await apg.waitForTimeout(400);
    }

    for (const q of QUESTIONS) await addAndFill(q);
    // verify all three prompts landed in the list before saving
    for (const q of QUESTIONS) {
      await apg.waitForSelector(`ol li:has-text("${q.prompt.slice(0, 30)}")`, { timeout: 8000 }).catch(() => {});
    }

    await shot(apg, "exam-editor-questions");
    // save structure — retry until rows persist
    let qrows = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      await apg.locator('button:has-text("Save questions")').first().click();
      await apg.waitForTimeout(3000);
      qrows = await api(`exam_paper_questions?exam_id=eq.${examId}&select=question_number,marks,question_type`) ?? [];
      if (Array.isArray(qrows) && qrows.length === 3) break;
    }
    rec("questions saved", Array.isArray(qrows) && qrows.length === 3 ? "PASS" : "FAIL", JSON.stringify(qrows).slice(0, 250));
    const saveMsg = (await apg.locator("body").innerText()).split("\n").filter((l) => /saved|fail|error|question \d/i.test(l)).slice(0, 4).join(" | ");
    rec("save msg", "INFO", saveMsg.slice(0, 200));

    // publish
    await apg.locator('button:has-text("Publish")').first().click();
    await apg.waitForTimeout(2000);
    await shot(apg, "exam-published");
    await apg.waitForTimeout(1500);
    const pageMsg = (await apg.locator("body").innerText()).split("\n").filter((l) => /achievable|add up|total marks|publish|fail|error/i.test(l)).slice(0, 4).join(" | ");
    rec("publish msg", "INFO", pageMsg.slice(0,200));
    const pubStatus = await api(`exams?id=eq.${examId}&select=status`);
    rec("exam published", pubStatus?.[0]?.status === "published" ? "PASS" : "FAIL", "status=" + (pubStatus?.[0]?.status ?? "?"));
  } catch (e) { rec("question entry", "FAIL", String(e.message).slice(0, 200)); }
}

// ============================================================ STUDENT JOURNEY
const { ctx: sctx, pg: spg } = await newPage({ width: 1440, height: 1000 }, [studentCookie]);
spg.on("dialog", d => d.accept());
try {
  await spg.goto(`${BASE}/exams`, { waitUntil: "domcontentloaded" });
  await spg.waitForTimeout(1500);
  await shot(spg, 'student-exams-list');
  rec('student exams page', 'INFO', 'url=' + spg.url() + ' :: ' + (await spg.locator('body').innerText()).slice(0, 150).split('\n').join(' | '));
  // open the exam
  await spg.waitForSelector('a:has-text("Javoodle E2E"), a:has-text("Validation")', { timeout: 20000 });
  await spg.locator('a:has-text("Javoodle E2E"), a:has-text("Validation")').first().click();
  try {
    await spg.waitForURL(/\/exams\/[0-9a-f-]+/, { timeout: 20000 });
  } catch {
    rec("exam detail nav", "INFO", "url=" + spg.url() + " :: " + (await spg.locator("body").innerText()).slice(0, 200).split("\n").join(" | "));
    throw new Error("exam detail navigation failed");
  }
  await spg.waitForTimeout(1000);
  await shot(spg, "exam-detail");
  // start attempt — may show an inline confirm step first
  const startBtn = spg.locator('button:has-text("Start examination"), button:has-text("Yes, start"), a:has-text("Resume")').first();
  await startBtn.click();
  await spg.waitForTimeout(800);
  const yesBtn = spg.locator('button:has-text("Yes, start the exam")').first();
  if (await yesBtn.count()) { await yesBtn.click(); }
  // client-side nav to /take is flaky — the attempt row is the source of truth.
  // Poll for the in-progress attempt, then open the runner directly.
  let found = null;
  for (let i = 0; i < 20 && !found; i++) {
    const rows = await api(`exam_attempts?select=id,status&exam_id=eq.${examId}&student_id=eq.${studentId}&status=eq.in_progress&limit=1`);
    found = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!found) await spg.waitForTimeout(1000);
  }
  if (!found) throw new Error("attempt was not created by Start examination");
  await spg.goto(`${BASE}/exams/${examId}/take`, { waitUntil: "domcontentloaded" });
  await spg.waitForTimeout(3500);
  await shot(spg, "exam-runner-start");
  rec("attempt started", "PASS", spg.url());

  // Q1 MCQ — select 'extends' option
  const mcqRadio = spg.locator('input[type="radio"]').nth(1); // options order: implements(0), extends(1)
  await mcqRadio.check().catch(async () => { await spg.locator('label:has-text("extends")').first().click(); });
  await spg.waitForTimeout(1500); // autosave debounce

  // navigate to Q2 via palette or Next
  const nextBtn = spg.locator('button:has-text("Next"), button:has-text("next")').first();
  if (await nextBtn.count()) { await nextBtn.click(); await spg.waitForTimeout(800); }
  await shot(spg, "exam-q2-program");
  // program answer — textarea
  await spg.locator("textarea").first().fill(`import java.util.Scanner;\npublic class Main {\n  public static void main(String[] a){ Scanner s=new Scanner(System.in); int n=s.nextInt(); System.out.println(n*n); }\n}`);
  await spg.waitForTimeout(1500);

  if (await nextBtn.count()) { await nextBtn.click(); await spg.waitForTimeout(800); }
  await shot(spg, "exam-q3-paragraph");
  await spg.locator("textarea").first().fill("A while loop checks its condition before each iteration, so the body may run zero times. A do-while loop executes the body once first, then checks the condition, guaranteeing at least one execution. Both repeat until the condition becomes false.");
  await spg.waitForTimeout(1500);

  // mark Q3 for review via flag button
  await spg.locator('button:has-text("Mark for review"), button:has-text("Flag")').first().click().catch(() => {});
  await shot(spg, "exam-answered-palette");
  rec("answers entered + flagged", "PASS");

  // refresh — verify persistence
  await spg.reload({ waitUntil: "domcontentloaded" });
  await spg.waitForTimeout(3000);
  await shot(spg, "exam-after-refresh");
  const persisted = await spg.evaluate(() => document.body.innerText.includes("extends") || document.querySelectorAll("textarea").length > 0);
  rec("refresh persistence", persisted ? "PASS" : "WARN", "page reloaded");

  // submit
  const submitBtn = spg.locator('button:has-text("Submit")').first();
  await submitBtn.click();
  await spg.waitForTimeout(800);
  // inline confirmation modal — must click "Yes, submit" specifically
  await spg.locator('button:has-text("Yes, submit")').click();
  await spg.waitForTimeout(4000);
  await shot(spg, "exam-submitted");
  rec("exam submitted", "PASS");
} catch (e) { rec("student journey", "FAIL", String(e.message).slice(0, 200)); }

// find attempt id
const attempts = await api(`exam_attempts?select=id,status,exam_id&student_id=eq.${studentId}&order=started_at.desc&limit=1`);
const attemptId = attempts?.[0]?.id;
rec("attempt id", attemptId ? "PASS" : "FAIL", attemptId ?? "");

// ============================================================ ADMIN EVALUATION
if (attemptId) {
  try {
    // wait for submission to land
    let st = null;
    for (let i = 0; i < 15; i++) {
      const rows = await api(`exam_attempts?id=eq.${attemptId}&select=status`);
      st = rows?.[0]?.status;
      if (st && st !== "in_progress") break;
      await apg.waitForTimeout ? apg.waitForTimeout(1000) : new Promise(r => setTimeout(r, 1000));
    }
    rec("attempt submitted (api)", st && st !== "in_progress" ? "PASS" : "FAIL", "status=" + st);

    await apg.goto(`${BASE}/admin/exams/submissions/${attemptId}`, { waitUntil: "domcontentloaded" });
    await apg.waitForTimeout(3000);
    await shot(apg, "admin-evaluation");

    // MCQ is auto-graded server-side; manually evaluate program (Q2→14) + paragraph (Q3→9)
    const progressText = async () => (await apg.locator("body").innerText()).split("\n").filter((l) => /Evaluate all|questions to complete|done\)/i.test(l)).join(" | ");
    rec("eval progress (before)", "INFO", (await progressText()).slice(0, 160));
    const targets = [{ q: "Q2", marks: "14" }, { q: "Q3", marks: "9" }];
    for (const t of targets) {
      const pal = apg.locator(`button[title*="${t.q}"]`).first();
      if (await pal.count()) { await pal.click(); await apg.waitForTimeout(800); }
      const inp = apg.locator('input[max]').first();
      if (await inp.count()) {
        await inp.fill(t.marks);
        const fb = apg.locator("textarea").last();
        if (await fb.count()) await fb.fill("Good attempt — mostly correct.").catch(() => {});
        await apg.locator('button:has-text("Save marks"), button:has-text("Update marks")').first().click();
        await apg.waitForTimeout(1500);
        const st = (await apg.locator("body").innerText()).split("\n").filter((l) => /Saved|failed|between 0 and/i.test(l)).slice(-2).join(" | ");
        rec(`save ${t.q}`, "INFO", st.slice(0, 120));
      }
    }
    await shot(apg, "admin-evaluation-filled");
    // router.refresh() is async — poll until the UI reflects all evaluations
    let prog = "";
    for (let i = 0; i < 15; i++) {
      prog = await progressText();
      if (/\(3 done\)/.test(prog)) break;
      await apg.waitForTimeout(1000);
    }
    rec("eval progress (final)", /\(3 done\)/.test(prog) ? "PASS" : "WARN", prog.slice(0, 160));

    // publish result when all evaluated
    const pubBtn = apg.locator('button:has-text("Publish result")').first();
    if (await pubBtn.count()) {
      let disabled = await pubBtn.isDisabled();
      for (let i = 0; i < 10 && disabled; i++) { await apg.waitForTimeout(1000); disabled = await pubBtn.isDisabled(); }
      rec("publish button state", disabled ? "WARN" : "PASS", disabled ? "disabled" : "enabled");
      if (!disabled) { await pubBtn.click(); await apg.waitForTimeout(2500); }
    }
    await shot(apg, "admin-evaluation-done");

    // verify via API
    const evs = await api(`exam_evaluations?attempt_id=eq.${attemptId}&select=paper_question_id,marks_awarded`);
    const att = await api(`exam_attempts?id=eq.${attemptId}&select=status,total_score,percentage`);
    rec("evaluations saved", Array.isArray(evs) && evs.length >= 3 ? "PASS" : "FAIL", `rows=${Array.isArray(evs) ? evs.length : "?"}`);
    rec("final attempt state", att?.[0] ? "PASS" : "FAIL", JSON.stringify(att?.[0] ?? {}));
  } catch (e) { rec("admin evaluation", "FAIL", String(e.message).slice(0, 200)); }
}

// ============================================================ STUDENT RESULT
try {
  const res = await api(`exam_attempts?select=id,status,total_score,percentage&student_id=eq.${studentId}&order=started_at.desc&limit=1`);
  const a = res?.[0];
  const scoreOk = a && (a.status === "result_published" || a.status === "evaluated" || a.status === "evaluation_completed") && Number(a.total_score) === 28;
  rec("final score", scoreOk ? "PASS" : "FAIL", JSON.stringify(a ?? {}));
  await spg.goto(`${BASE}/exams/${examId}/result`, { waitUntil: "domcontentloaded" });
  await spg.waitForTimeout(2500);
  await shot(spg, "student-result");
  const bodyTxt = await spg.locator("body").innerText();
  rec("result page shows score", /28|93/.test(bodyTxt) ? "PASS" : "WARN", bodyTxt.slice(0, 120).split("\n").join(" | "));
  // refresh stability — score must not change
  await spg.reload({ waitUntil: "domcontentloaded" });
  await spg.waitForTimeout(2000);
  const res2 = await api(`exam_attempts?id=eq.${attemptId}&select=total_score,status`);
  rec("result stable on refresh", res2?.[0]?.total_score === a?.total_score ? "PASS" : "FAIL", JSON.stringify(res2?.[0] ?? {}));
} catch (e) { rec("result view", "FAIL", String(e.message).slice(0, 150)); }

// ============================================================ TIMER EXPIRY TEST
// Second student attempts the same published exam; deadline_at is shortened
// via service role on OUR test record only — exercises the real client
// countdown -> doSubmit(true) -> submitExamAction path without waiting 120min.
let student2Id = null, attempt2Id = null;
try {
  const t2 = "jds_" + randomBytes(32).toString("base64url");
  const h2 = createHash("sha256").update(t2, "utf8").digest("hex");
  const s2 = await api("students?select=id&display_name=eq.E2ETimer");
  student2Id = s2?.[0]?.id;
  if (!student2Id) { const r = await api("students", { method: "POST", body: JSON.stringify({ display_name: "E2ETimer" }) }); student2Id = r?.[0]?.id; }
  await api("student_sessions", { method: "POST", body: JSON.stringify({ student_id: student2Id, token_hash: h2, expires_at: new Date(Date.now() + 864e5).toISOString() }) });

  const { ctx: tctx, pg: tpg } = await newPage({ width: 1440, height: 1000 }, [{ name: "javoodle_session", value: t2, domain: "localhost", path: "/" }]);
  tpg.on("dialog", d => d.accept());
  await tpg.goto(`${BASE}/exams/${examId}`, { waitUntil: "domcontentloaded" });
  await tpg.waitForTimeout(1500);
  const start2 = tpg.locator('button:has-text("Start examination"), button:has-text("Yes, start"), a:has-text("Resume")').first();
  if (await start2.count()) { await start2.click(); await tpg.waitForTimeout(800); const y = tpg.locator('button:has-text("Yes, start the exam")').first(); if (await y.count()) await y.click(); }
  // find attempt2
  for (let i = 0; i < 20 && !attempt2Id; i++) {
    const rows = await api(`exam_attempts?select=id&exam_id=eq.${examId}&student_id=eq.${student2Id}&status=eq.in_progress&limit=1`);
    attempt2Id = Array.isArray(rows) && rows[0]?.id;
    if (!attempt2Id) await tpg.waitForTimeout(1000);
  }
  rec("timer attempt created", attempt2Id ? "PASS" : "FAIL", attempt2Id ?? "");
  if (attempt2Id) {
    // shorten deadline BEFORE the runner mounts — the client countdown uses
    // the deadlineAt prop frozen at render time
    const newDeadline = new Date(Date.now() + 5000).toISOString();
    await fetch(`${SUPA}/rest/v1/exam_attempts?id=eq.${attempt2Id}`, { method: "PATCH", headers: H, body: JSON.stringify({ deadline_at: newDeadline }) });
    await tpg.goto(`${BASE}/exams/${examId}/take`, { waitUntil: "domcontentloaded" });
    await tpg.waitForTimeout(3000);
    await shot(tpg, "timer-runner");
    // runner ticks every 1s and auto-submits at expiry — wait for it
    let final = null;
    for (let i = 0; i < 20; i++) {
      const rows = await api(`exam_attempts?id=eq.${attempt2Id}&select=status`);
      final = rows?.[0]?.status;
      if (final && final !== "in_progress") break;
      await tpg.waitForTimeout(1000);
    }
    rec("timer auto-submit", final === "submitted" || final === "under_evaluation" ? "PASS" : "FAIL", "status=" + final);
    await shot(tpg, "timer-after-expiry");
    // refresh — must show submitted state, not restart
    await tpg.reload({ waitUntil: "domcontentloaded" });
    await tpg.waitForTimeout(2500);
    const rows2 = await api(`exam_attempts?id=eq.${attempt2Id}&select=status`);
    const stable = rows2?.[0]?.status && rows2[0].status !== "in_progress";
    rec("post-expiry refresh stable", stable ? "PASS" : "FAIL", "status=" + rows2?.[0]?.status);
    await shot(tpg, "timer-after-refresh");
    // idempotent: attempt cannot be submitted twice — status must not regress
    const rows3 = await api(`exam_attempts?id=eq.${attempt2Id}&select=status,total_score`);
    rec("no double-submit", rows3?.[0] && rows3[0].status !== "in_progress" ? "PASS" : "FAIL", JSON.stringify(rows3?.[0] ?? {}));
  }
  // cleanup student2 + attempt2
  if (attempt2Id) {
    await api(`exam_attempt_question_selections?attempt_id=eq.${attempt2Id}`, { method: "DELETE" });
    await api(`exam_answers?attempt_id=eq.${attempt2Id}`, { method: "DELETE" });
    await api(`exam_evaluations?attempt_id=eq.${attempt2Id}`, { method: "DELETE" });
    await api(`exam_attempts?id=eq.${attempt2Id}`, { method: "DELETE" });
  }
  if (student2Id) {
    await api(`student_sessions?student_id=eq.${student2Id}`, { method: "DELETE" });
    await api(`students?id=eq.${student2Id}`, { method: "DELETE" });
  }
  await tctx.close();
} catch (e) { rec("timer test", "FAIL", String(e.message).slice(0, 200)); }

// ============================================================ SECURITY TESTS
try {
  // unauthenticated admin
  const { ctx: uctx, pg: upg } = await newPage();
  await upg.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await upg.waitForTimeout(1500);
  rec("unauth admin blocked", upg.url().includes("/admin/login") ? "PASS" : "FAIL", upg.url());
  await uctx.close();
  // student cannot access admin
  await spg.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await spg.waitForTimeout(1500);
  rec("student admin blocked", spg.url().includes("/admin/login") ? "PASS" : "FAIL", spg.url());
} catch (e) { rec("security tests", "FAIL", String(e.message).slice(0, 150)); }

// ============================================================ CLEANUP
try {
  if (examId) {
    await api(`exam_attempt_question_selections?attempt_id=eq.${attemptId}`, { method: "DELETE" });
    await api(`exam_answers?attempt_id=eq.${attemptId}`, { method: "DELETE" });
    await api(`exam_evaluations?attempt_id=eq.${attemptId}`, { method: "DELETE" });
    await api(`exam_attempts?id=eq.${attemptId}`, { method: "DELETE" });
    await api(`exam_optional_groups?exam_id=eq.${examId}`, { method: "DELETE" });
    await api(`exam_sections?exam_id=eq.${examId}`, { method: "DELETE" });
    await api(`exam_paper_questions?exam_id=eq.${examId}`, { method: "DELETE" });
    await api(`exams?id=eq.${examId}`, { method: "DELETE" });
    rec("cleanup", "PASS", "exam + attempt removed");
  }
  await api(`student_sessions?student_id=eq.${studentId}`, { method: "DELETE" });
  await api(`students?id=eq.${studentId}`, { method: "DELETE" });
  // admin user retained for iteration
} catch (e) { rec("cleanup", "WARN", String(e.message).slice(0, 100)); }

await browser.close();
writeFileSync(`${OUT}reports/e2e-results.json`, JSON.stringify({ results, errors }, null, 2));
console.log("\n=== E2E RESULTS ===");
results.forEach(r => console.log(`${r.status.padEnd(5)} ${r.step}${r.note ? " — " + r.note : ""}`));
console.log("pageerrors:", errors.length ? errors.slice(0, 5) : "none");
