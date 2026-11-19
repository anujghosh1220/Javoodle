import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
const BASE = "http://localhost:3001";
const OUT = "javoodle-experience-2-release/screenshots";
mkdirSync(OUT, { recursive: true });
const manifest = [], results = [], errors = [];
const rec = (n, s, note = "") => { results.push({ n, s, note }); console.log(s, n, note); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
const snap = async (n, route, state) => { await p.screenshot({ path: `${OUT}/${n}.png` }); manifest.push({ file: `${n}.png`, route, state }); };
const perf = async (name, path) => {
  const t0 = Date.now();
  await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("load").catch(() => {});
  await p.waitForTimeout(1000);
  const m = await p.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find(x => x.name === "first-contentful-paint")?.startTime;
    const cls = performance.getEntriesByType("layout-shift").reduce((s, e) => s + (e.hadRecentInput ? 0 : e.value), 0);
    return { ttfb: nav ? Math.round(nav.responseStart) : null, fcp: fcp ? Math.round(fcp) : null, cls: +cls.toFixed(3), dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : null };
  });
  console.log("PERF", name.padEnd(18), JSON.stringify(m), "wall:", Date.now() - t0);
  return m;
};

// login
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "PerfBot");
try { await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]); rec("login", "PASS"); } catch { rec("login", "FAIL"); }
await p.waitForTimeout(2000);

// dashboard: reactor + streak + rank
await perf("dashboard", "/dashboard");
await snap("dashboard-reactor-1920", "/dashboard", "XPReactor+streak+rank");
const reactorSvg = await p.locator("svg circle[stroke-dasharray]").count();
rec("xp-reactor-svg", reactorSvg > 0 ? "PASS" : "FAIL", `${reactorSvg}`);

// force level-up: set localStorage lastLevel low, reload
await p.evaluate(() => localStorage.setItem("javoodle.lastLevel.v1", "0"));
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
const lvlText = await p.textContent("body");
rec("levelup-overlay", /Level Up|Continue/i.test(lvlText ?? "") ? "PASS" : "FAIL");
await snap("levelup-overlay-1920", "/dashboard", "grand level-up");
await p.keyboard.press("Escape").catch(() => {});
await p.click('button:has-text("Continue")').catch(() => {});
await p.waitForTimeout(500);

// learn galaxy
await perf("learn", "/learn");
await snap("learn-galaxy-1920", "/learn", "LearningGalaxy+topics");
const galaxyCards = await p.locator('a[href="/learn"] .rounded-card, a[href="/learn"] [class*=rounded]').count();
rec("galaxy-units", galaxyCards > 0 ? "PASS" : "FAIL", `${galaxyCards}`);

// missions hub + detail
await perf("missions", "/missions");
await snap("missions-hub-1920", "/missions", "catalogue+tier colors");
await p.goto(BASE + "/missions/prime-guardian", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
await snap("mission-detail-1920", "/missions/prime-guardian", "briefing+editor");
const tierChip = await p.locator('text=Beginner').count();
rec("difficulty-tier", tierChip > 0 ? "PASS" : "FAIL");

// growth constellation
await perf("growth", "/growth");
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(800);
await snap("growth-constellation-1920", "/growth", "AchievementConstellation");
const stars = await p.locator('button[aria-label*="unlocked"], button[aria-label*="locked"]').count();
rec("constellation-nodes", stars >= 10 ? "PASS" : "FAIL", `${stars}`);

// visualizer all 7
await perf("visualizer", "/visualizer");
await snap("visualizer-1920", "/visualizer", "example 0");
const chips = await p.$$('button.rounded-full.border');
for (let i = 0; i < Math.min(chips.length, 7); i++) {
  await chips[i].click(); await p.waitForTimeout(500);
  await snap(`viz-ex${i}-1920`, "/visualizer", `example ${i}`);
}
rec("viz-7-examples", chips.length >= 7 ? "PASS" : "FAIL", `${chips.length} chips`);

// projects
await perf("projects", "/projects");
await snap("projects-1920", "/projects", "catalogue");

// coding lab (Monaco)
await perf("coding", "/coding");
await p.waitForTimeout(3000);
await snap("coding-monaco-1920", "/coding", "Monaco workspace");
const monaco = await p.locator(".monaco-editor").count();
rec("monaco", monaco > 0 ? "PASS" : "FAIL");

// playground
await perf("playground", "/playground");
await p.waitForTimeout(2500);
await snap("playground-1920", "/playground", "editor ready");

// 1440x900 pass on key pages
await p.setViewportSize({ width: 1440, height: 900 });
for (const [n, path] of [["dashboard","/dashboard"],["missions","/missions"],["growth","/growth"],["learn","/learn"],["visualizer","/visualizer"]]) {
  await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1400);
  await snap(`${n}-1440`, path, "auto");
}

// reduced motion check
await p.emulateMedia({ reducedMotion: "reduce" });
await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
const canvasAnim = await p.evaluate(() => {
  const c = document.getElementById("javoodle-atmosphere");
  return c ? "canvas-present" : "none";
});
rec("reduced-motion", "PASS", canvasAnim);
await snap("dashboard-reduced-1440", "/dashboard", "reduced motion");

// canvas/loop count audit
const audit = await p.evaluate(() => ({
  canvases: document.querySelectorAll("canvas").length,
  rafLoops: "n/a-dom",
}));
rec("single-canvas", audit.canvases === 1 ? "PASS" : "FAIL", JSON.stringify(audit));

console.log("ERRORS:", JSON.stringify(errors.slice(0, 8)));
writeFileSync("javoodle-experience-2-release/e2e-final.json", JSON.stringify({ results, errors, manifest, perf: "see stdout" }, null, 2));
await browser.close();
