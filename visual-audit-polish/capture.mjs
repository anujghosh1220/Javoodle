// UX-polish visual audit — robot collision checks + focused states.
// Requires `npm run start` on :3216. Usage: node visual-audit-polish/capture.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3216";
const OUT = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0 && !line.trim().startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
const SKEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SKEY, Authorization: `Bearer ${SKEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const api = async (p, o = {}) => { const r = await fetch(`${SUPA}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers ?? {}) } }); if (!r.ok) return null; const t = await r.text(); return t ? JSON.parse(t) : null; };

for (const d of ["desktop", "mobile", "states", "reports"]) mkdirSync(`${OUT}${d}`, { recursive: true });

const token = "jds_" + randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(token, "utf8").digest("hex");
let sid = null;
{
  const s = await api("students?select=id&display_name=eq.PolishAudit");
  sid = s?.[0]?.id;
  if (!sid) { const r = await api("students", { method: "POST", body: JSON.stringify({ display_name: "PolishAudit" }) }); sid = r?.[0]?.id; }
  await api("student_sessions", { method: "POST", body: JSON.stringify({ student_id: sid, token_hash: hash, expires_at: new Date(Date.now() + 864e5).toISOString() }) });
}
const cookie = { name: "javoodle_session", value: token, domain: "localhost", path: "/" };

const manifest = [];
const report = { shots: 0, collisions: [], errors: [] };

// interactive elements that must never be covered
const INTERACTIVE = 'main button, main a[href], main input, main textarea, main select, main .monaco-editor';

async function checkRobot(pg, label) {
  // wait for robot to roam a bit
  await pg.waitForTimeout(2500);
  const res = await pg.evaluate((sel) => {
    const robot = document.querySelector("[data-companion]");
    const rb = robot?.getBoundingClientRect();
    if (!rb) return { robot: false };
    const bubble = robot.querySelector("[data-side]")?.firstElementChild?.getBoundingClientRect?.() ?? null;
    const hits = [];
    for (const el of document.querySelectorAll(sel)) {
      if (el.closest("[data-companion]") || el.closest("[data-companion-controls]")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      const ix = Math.max(0, Math.min(rb.right, r.right) - Math.max(rb.left, r.left));
      const iy = Math.max(0, Math.min(rb.bottom, r.bottom) - Math.max(rb.top, r.top));
      if (ix * iy > 40) hits.push(el.tagName + "." + (el.className?.toString().slice(0, 30) ?? ""));
      if (bubble) {
        const bx = Math.max(0, Math.min(bubble.right, r.right) - Math.max(bubble.left, r.left));
        const by = Math.max(0, Math.min(bubble.bottom, r.bottom) - Math.max(bubble.top, r.top));
        if (bx * by > 40) hits.push("BUBBLE>" + el.tagName);
      }
    }
    return { robot: true, robotBox: { x: Math.round(rb.x), y: Math.round(rb.y), w: Math.round(rb.width), h: Math.round(rb.height) }, hits: hits.slice(0, 5) };
  }, INTERACTIVE);
  manifest.push({ check: label, ...res });
  if (res.hits?.length) report.collisions.push({ label, hits: res.hits });
  return res;
}

async function visit(pg, name, path, vp, opts = {}) {
  const errs = [];
  pg.on("pageerror", e => errs.push(e.message.slice(0, 80)));
  const resp = await pg.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });
  await pg.waitForTimeout(opts.wait ?? 3000);
  if (opts.scroll) { await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await pg.waitForTimeout(800); await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(500); }
  const file = `${vp}/${name}.png`;
  await pg.screenshot({ path: `${OUT}${file}`, fullPage: opts.full ?? true });
  report.shots++;
  const m = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  manifest.push({ route: name, path, viewport: vp, status: resp?.status(), overflow: m.sw > m.cw + 2, consoleErrors: errs.slice(0, 3), screenshot: file });
  if (errs.length) report.errors.push({ route: name, errs: errs.slice(0, 2) });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addCookies([cookie]);
const pg = await ctx.newPage();

const PAGES = [
  ["dashboard", "/dashboard", { scroll: true }],
  ["learn", "/learn"],
  ["learn-topic", "/learn/e9066c5f-3ad0-4748-8bd1-c9fb012cf8d3"],
  ["lesson", "/learn/lesson/733ef3af-7d87-4301-a837-f3c680e2841b"],
  ["practice", "/practice"],
  ["practice-session", "/practice/session?topic=all"],
  ["playground", "/playground"],
  ["growth", "/growth", { scroll: true }],
  ["coding-list", "/coding"],
  ["coding-question", "/coding/65437800-ca51-4e40-b78b-5a4645987fdc", { wait: 5000 }],
  ["exams", "/exams"],
];

for (const [name, path, opts] of PAGES) {
  await visit(pg, name, path, "desktop", opts);
  await checkRobot(pg, `desktop/${name}`);
}
// long-scroll check on dashboard
await pg.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
await pg.waitForTimeout(2000);
await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await pg.waitForTimeout(1200);
await checkRobot(pg, "desktop/dashboard-scrolled");
await pg.evaluate(() => window.scrollTo(0, 0));

// dock collapsed state
await pg.locator("[data-companion-controls] button[aria-label*='Collapse']").first().click().catch(() => {});
await pg.waitForTimeout(600);
await pg.screenshot({ path: `${OUT}states/dock-collapsed.png` });
report.shots++;
await pg.locator("[data-companion-controls] button[aria-label*='Expand']").first().click().catch(() => {});
await pg.waitForTimeout(600);
await pg.screenshot({ path: `${OUT}states/dock-expanded.png` });
report.shots++;

// playground states: example + run
await pg.goto(BASE + "/playground", { waitUntil: "domcontentloaded" });
await pg.waitForTimeout(4000);
await pg.locator("button", { hasText: "Hello world" }).first().click().catch(() => {});
await pg.waitForTimeout(500);
await pg.screenshot({ path: `${OUT}states/playground-example.png` });
report.shots++;
await pg.fill("#pg-stdin", "Anuj\n");
await pg.screenshot({ path: `${OUT}states/playground-stdin.png` });
report.shots++;
await pg.click('button:has-text("Run code")').catch(() => {});
await pg.waitForTimeout(12000);
await pg.screenshot({ path: `${OUT}states/playground-after-run.png` });
report.shots++;

// growth empty-state student (fresh session, no activity)
{
  const t2 = "jds_" + randomBytes(32).toString("base64url");
  const h2 = createHash("sha256").update(t2, "utf8").digest("hex");
  let s2 = await api("students?select=id&display_name=eq.GrowthEmpty");
  let sid2 = s2?.[0]?.id;
  if (!sid2) { const r = await api("students", { method: "POST", body: JSON.stringify({ display_name: "GrowthEmpty" }) }); sid2 = r?.[0]?.id; }
  await api("student_sessions", { method: "POST", body: JSON.stringify({ student_id: sid2, token_hash: h2, expires_at: new Date(Date.now() + 864e5).toISOString() }) });
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx2.addCookies([{ name: "javoodle_session", value: t2, domain: "localhost", path: "/" }]);
  const pg2 = await ctx2.newPage();
  await pg2.goto(BASE + "/growth", { waitUntil: "domcontentloaded" });
  await pg2.waitForTimeout(3000);
  await pg2.screenshot({ path: `${OUT}states/growth-empty.png`, fullPage: true });
  report.shots++;
  manifest.push({ route: "growth-empty", path: "/growth", viewport: "desktop", status: 200, screenshot: "states/growth-empty.png", note: "fresh student, no activity" });
  // cleanup
  await fetch(`${SUPA}/rest/v1/student_sessions?student_id=eq.${sid2}`, { method: "DELETE", headers: H });
  await fetch(`${SUPA}/rest/v1/students?id=eq.${sid2}`, { method: "DELETE", headers: H });
  await ctx2.close();
}

// mobile spot checks
{
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx3.addCookies([cookie]);
  const pg3 = await ctx3.newPage();
  for (const [name, path] of [["dashboard", "/dashboard"], ["practice", "/practice"], ["playground", "/playground"], ["growth", "/growth"]]) {
    await visit(pg3, name, path, "mobile", { wait: 2500 });
    await checkRobot(pg3, `mobile/${name}`);
  }
  await ctx3.close();
}

await ctx.close();
await browser.close();

// cleanup audit student
await fetch(`${SUPA}/rest/v1/student_sessions?student_id=eq.${sid}`, { method: "DELETE", headers: H });
await fetch(`${SUPA}/rest/v1/students?id=eq.${sid}`, { method: "DELETE", headers: H });

// outputs
writeFileSync(`${OUT}reports/screenshot-manifest.json`, JSON.stringify(manifest, null, 2));
writeFileSync(`${OUT}reports/capture-report.md`, `# UX Polish Audit — ${new Date().toISOString()}

Screenshots: ${report.shots}
Robot collision checks: ${manifest.filter(m => m.check).length}
Collision hits found: ${report.collisions.length ? JSON.stringify(report.collisions) : "none"}
Console/page errors: ${report.errors.length ? JSON.stringify(report.errors) : "none"}
Overflow flags: ${manifest.filter(m => m.overflow).map(m => m.route).join(", ") || "none"}
`);
const rows = manifest.map(m => m.screenshot ? `<tr><td><a href="../${m.screenshot}" target="_blank"><img src="../${m.screenshot}" loading="lazy"></a></td><td><code>${m.path ?? m.check ?? m.route}</code><br><small>${m.viewport ?? ""} ${m.status ?? ""} ${m.hits?.length ? "⚠ " + m.hits.join("; ") : ""}</small></td></tr>` : "").join("");
writeFileSync(`${OUT}index.html`, `<!doctype html><meta charset="utf-8"><title>Javoodle UX Polish Audit</title><style>body{font-family:system-ui;background:#0d1528;color:#c0cce0;margin:24px}h1{color:#f8fafc}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #293957;padding:8px;vertical-align:top}img{width:200px;border:1px solid #293957;border-radius:8px;display:block}code{color:#c084fc}small{color:#8fa1bc}</style><h1>Javoodle — UX Polish Audit</h1><p>${report.shots} screenshots · collisions: ${report.collisions.length}</p><table>${rows}</table>`);
console.log(`DONE shots=${report.shots} collisions=${report.collisions.length} errors=${report.errors.length}`);
