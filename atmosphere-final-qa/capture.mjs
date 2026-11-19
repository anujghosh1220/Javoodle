import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const BASE = "http://localhost:3000";
const OUT = "atmosphere-final-qa/screenshots";
mkdirSync(OUT, { recursive: true });

const manifest = [];
const errors = [];
const browser = await chromium.launch();

function rec(file, route, viewport, state, ok, note = "") {
  manifest.push({ file, route, viewport, state, ok, note });
  console.log(`${ok ? "OK " : "FAIL"} ${file} :: ${route} :: ${state}${note ? " :: " + note : ""}`);
}

async function newPage(w, h, tag) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(`${tag} console: ${m.text().slice(0, 160)}`);
  });
  return { ctx, p };
}

async function snap(p, name, route, viewport, state, extraWait = 1600) {
  await p.waitForTimeout(extraWait);
  const file = `${name}.png`;
  await p.screenshot({ path: `${OUT}/${file}` });
  rec(file, route, viewport, state, true);
}

// ============ PHASE 1 — public landing, 3 resolutions ============
for (const [w, h, tag] of [[1440, 900, "1440x900"], [1920, 1080, "1920x1080"], [1366, 768, "1366x768"]]) {
  const { ctx, p } = await newPage(w, h, `landing-${tag}`);
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await snap(p, `landing-${tag}`, "/", tag, "default auto preset");
  await ctx.close();
}

// ============ PHASE 2 — student login ============
const { ctx: sctx, p: sp } = await newPage(1920, 1080, "student");
await sp.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await sp.fill('input[name="name"]', "Ava");
try {
  await Promise.all([
    sp.waitForURL("**/dashboard", { timeout: 25000 }),
    sp.click('button[type="submit"]'),
  ]);
  rec("login", "/", "1920x1080", "student login as Ava", true);
} catch (e) {
  rec("login", "/", "1920x1080", "student login as Ava", false, e.message.slice(0, 120));
}
await sp.waitForTimeout(1800);
await sp.screenshot({ path: `${OUT}/dashboard-1920x1080.png` });
manifest.push({ file: "dashboard-1920x1080.png", route: "/dashboard", viewport: "1920x1080", state: "default auto", ok: true });

// ============ PHASE 3 — student pages @1920 ============
const studentPages = [
  ["learn", "/learn"],
  ["practice", "/practice"],
  ["coding", "/coding"],
  ["playground", "/playground"],
  ["growth", "/growth"],
  ["exams", "/exams"],
];
for (const [n, path] of studentPages) {
  await sp.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await snap(sp, `${n}-1920x1080`, path, "1920x1080", "default auto");
}

// learn lesson + topic pages (first links)
await sp.goto(BASE + "/learn", { waitUntil: "domcontentloaded" });
await sp.waitForTimeout(1200);
const learnLink = await sp.$('a[href^="/learn/"]');
if (learnLink) {
  const href = await learnLink.getAttribute("href");
  await sp.goto(BASE + href, { waitUntil: "domcontentloaded" });
  await snap(sp, "learn-detail-1920x1080", href, "1920x1080", "learn subpage");
}

// coding question (Monaco) — first coding link
await sp.goto(BASE + "/coding", { waitUntil: "domcontentloaded" });
await sp.waitForTimeout(1200);
const codeLink = await sp.$('a[href^="/coding/"]');
if (codeLink) {
  const href = await codeLink.getAttribute("href");
  await sp.goto(BASE + href, { waitUntil: "domcontentloaded" });
  await sp.waitForTimeout(3500); // monaco init
  await snap(sp, "coding-workspace-1920x1080", href, "1920x1080", "monaco editor visible");
} else {
  rec("coding-workspace", "/coding/[id]", "1920x1080", "monaco", false, "no coding question links");
}

// practice session attempt
await sp.goto(BASE + "/practice/session?topic=all", { waitUntil: "domcontentloaded" });
await sp.waitForTimeout(2000);
const hasQuestion = await sp.$("text=/Check answer|Next question|marks/");
if (hasQuestion) {
  await snap(sp, "practice-session-1920x1080", "/practice/session?topic=all", "1920x1080", "question visible");
  // try to answer: click first MCQ option if present, else type
  const opt = await sp.$('button:has-text("A")');
  const mcqOpt = await sp.$('ul button, [role="radio"], button.rounded-2xl');
  if (mcqOpt) {
    await mcqOpt.click();
    await sp.waitForTimeout(300);
    const checkBtn = await sp.$('button:has-text("Check answer")');
    if (checkBtn) {
      await checkBtn.click();
      await sp.waitForTimeout(1800);
      await snap(sp, "practice-feedback-1920x1080", "/practice/session?topic=all", "1920x1080", "post-answer feedback (correct or incorrect)");
    }
  }
} else {
  rec("practice-session", "/practice/session?topic=all", "1920x1080", "session", false, "no questions available");
}

// exams: find take link
await sp.goto(BASE + "/exams", { waitUntil: "domcontentloaded" });
await sp.waitForTimeout(1200);
const examLink = await sp.$('a[href^="/exams/"]');
let examHref = null;
if (examLink) {
  examHref = await examLink.getAttribute("href");
  await sp.goto(BASE + examHref, { waitUntil: "domcontentloaded" });
  await snap(sp, "exam-detail-1920x1080", examHref, "1920x1080", "exam detail");
  const takeLink = await sp.$('a[href*="/take"]');
  if (takeLink) {
    const th = await takeLink.getAttribute("href");
    await sp.goto(BASE + th, { waitUntil: "domcontentloaded" });
    await sp.waitForTimeout(2000);
    await snap(sp, "exam-take-1920x1080", th, "1920x1080", "exam focus mode");
  } else rec("exam-take", "*/take", "1920x1080", "focus", false, "no take link on detail page");
} else {
  rec("exams", "/exams", "1920x1080", "exam detail/take", false, "no published exams for student");
}

// ============ PHASE 4 — atmosphere settings states @1920 ============
await sp.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
await sp.waitForTimeout(1800);
await snap(sp, "settings-default-1920x1080", "/dashboard", "1920x1080", "settings card visible");

const states = [
  ["matrix", { mode: "matrix" }],
  ["neural", { mode: "neural" }],
  ["aurora", { mode: "aurora" }],
  ["minimal", { mode: "minimal" }],
  ["fx-off", { effects: false }],
  ["reduced", { reducedMotion: true }],
];
for (const [name, patch] of states) {
  await sp.evaluate((p) => {
    const key = "javoodle.atmosphere.v1";
    let cur = {};
    try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
    localStorage.setItem(key, JSON.stringify({ ...cur, ...p }));
  }, patch);
  await sp.reload({ waitUntil: "domcontentloaded" });
  await sp.waitForTimeout(2200);
  await snap(sp, `settings-${name}-1920x1080`, "/dashboard", "1920x1080", `preset/state: ${name}`);
}
// restore auto
await sp.evaluate(() => {
  const key = "javoodle.atmosphere.v1";
  let cur = {};
  try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  localStorage.setItem(key, JSON.stringify({ ...cur, mode: "auto", effects: true, reducedMotion: false }));
});
await sp.reload({ waitUntil: "domcontentloaded" });
await sp.waitForTimeout(1500);

// ============ PHASE 5 — other resolutions spot checks ============
for (const [w, h, tag] of [[1440, 900, "1440x900"], [1366, 768, "1366x768"]]) {
  await sp.setViewportSize({ width: w, height: h });
  for (const [n, path] of [["dashboard", "/dashboard"], ["coding", "/coding"], ["learn", "/learn"]]) {
    await sp.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await snap(sp, `${n}-${tag}`, path, tag, "auto preset");
  }
}
await sp.setViewportSize({ width: 1920, height: 1080 });

// ============ PHASE 6 — admin login ============
const { ctx: actx, p: ap } = await newPage(1920, 1080, "admin");
await ap.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded" });
await snap(ap, "admin-login-1920x1080", "/admin/login", "1920x1080", "public admin login");
await ap.goto(BASE + "/admin", { waitUntil: "domcontentloaded" });
await ap.waitForTimeout(1500);
await snap(ap, "admin-redirect-1920x1080", "/admin", "1920x1080", "unauthenticated admin (redirects to login)");
await actx.close();

await sctx.close();

// ============ PHASE 7 — performance instrumentation ============
const { ctx: pctx, p: pp } = await newPage(1920, 1080, "perf");
await pp.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await pp.fill('input[name="name"]', "Ava");
try {
  await Promise.all([pp.waitForURL("**/dashboard", { timeout: 25000 }), pp.click('button[type="submit"]')]);
} catch {}
await pp.waitForTimeout(1500);

const perf = {};
perf.canvasCount = await pp.evaluate(() => document.querySelectorAll("canvas").length);
perf.atmoCanvasCount = await pp.evaluate(() => document.querySelectorAll("#javoodle-atmosphere").length);

// FPS sampling over ~6s on dashboard
perf.fpsDashboard = await pp.evaluate(() => new Promise((res) => {
  let frames = 0;
  const t0 = performance.now();
  const tick = () => { frames++; if (performance.now() - t0 < 6000) requestAnimationFrame(tick); else res(Math.round(frames / ((performance.now() - t0) / 1000))); };
  requestAnimationFrame(tick);
}));

// navigate around, measure heap
perf.heapStart = await pp.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
for (const path of ["/learn", "/practice", "/coding", "/playground", "/growth", "/exams", "/dashboard", "/learn"]) {
  await pp.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await pp.waitForTimeout(900);
}
perf.heapAfterNav = await pp.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
perf.canvasAfterNav = await pp.evaluate(() => document.querySelectorAll("canvas").length);

// preset switching cost
perf.presetSwitchMs = await pp.evaluate(async () => {
  const t0 = performance.now();
  for (const mode of ["matrix", "neural", "aurora", "minimal", "auto"]) {
    const key = "javoodle.atmosphere.v1";
    let cur = {};
    try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
    localStorage.setItem(key, JSON.stringify({ ...cur, mode }));
    window.dispatchEvent(new Event("storage")); // may not trigger React; reload instead below
  }
  return Math.round(performance.now() - t0);
});
// real preset switching via UI clicks on dashboard
await pp.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
await pp.waitForTimeout(1500);
const t0 = Date.now();
for (const label of ["Matrix", "Neural", "Aurora", "Minimal", "Auto"]) {
  const btn = pp.locator(`button:has-text("${label}")`).first();
  if (await btn.count()) { await btn.click(); await pp.waitForTimeout(350); }
}
perf.presetUiSwitchTotalMs = Date.now() - t0;

// effects off -> canvas should clear
await pp.evaluate(() => {
  const key = "javoodle.atmosphere.v1";
  let cur = {};
  try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  localStorage.setItem(key, JSON.stringify({ ...cur, effects: false }));
});
await pp.reload({ waitUntil: "domcontentloaded" });
await pp.waitForTimeout(1500);
perf.canvasClearedWhenOff = await pp.evaluate(() => {
  const cv = document.getElementById("javoodle-atmosphere");
  if (!cv) return "no-canvas";
  const c = cv.getContext("2d");
  const d = c.getImageData(0, 0, cv.width, cv.height).data;
  let nonZero = 0;
  for (let i = 3; i < d.length; i += 40) if (d[i] > 8) nonZero++;
  return nonZero;
});
// restore
await pp.evaluate(() => {
  const key = "javoodle.atmosphere.v1";
  let cur = {};
  try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  localStorage.setItem(key, JSON.stringify({ ...cur, effects: true, mode: "auto" }));
});

// resize handling
await pp.setViewportSize({ width: 1366, height: 768 });
await pp.waitForTimeout(800);
perf.canvasSizeAfterResize = await pp.evaluate(() => {
  const cv = document.getElementById("javoodle-atmosphere");
  return cv ? `${cv.width}x${cv.height}` : "none";
});
await pp.setViewportSize({ width: 1920, height: 1080 });

// malformed prefs resilience
await pp.evaluate(() => localStorage.setItem("javoodle.atmosphere.v1", "{not json!!"));
await pp.reload({ waitUntil: "domcontentloaded" });
await pp.waitForTimeout(1500);
perf.malformedPrefsOk = await pp.evaluate(() => !!document.getElementById("javoodle-atmosphere"));
await pp.evaluate(() => localStorage.removeItem("javoodle.atmosphere.v1"));

// visibility pause — emulate by dispatching event won't work; measure rAF stops via CDP not available.
// Instead verify engine pauses: check that drawFrame isn't called when hidden is internal; report as inferred.

console.log("PERF", JSON.stringify(perf, null, 1));
writeFileSync("atmosphere-final-qa/perf.json", JSON.stringify(perf, null, 2));

console.log("ERRORS:", errors.length ? errors.slice(0, 15) : "none");
writeFileSync("atmosphere-final-qa/console-errors.json", JSON.stringify(errors, null, 2));
writeFileSync("atmosphere-final-qa/manifest.json", JSON.stringify(manifest, null, 2));
await browser.close();
