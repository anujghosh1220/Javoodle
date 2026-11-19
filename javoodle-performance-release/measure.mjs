import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
mkdirSync("javoodle-performance-release/screenshots", { recursive: true });
const BASE = "http://localhost:3001";
const out = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });

async function measure(name, path, { cold = false } = {}) {
  const t0 = Date.now();
  await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });
  // wait for load + settle
  await p.waitForLoadState("load").catch(() => {});
  await p.waitForTimeout(1200);
    const m = await p.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find(x => x.name === "first-contentful-paint")?.startTime;
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    const lcp = lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : null;
    const resources = performance.getEntriesByType("resource");
    return {
      ttfb: nav ? Math.round(nav.responseStart) : null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load: nav ? Math.round(nav.loadEventEnd) : null,
      fcp: fcp ? Math.round(fcp) : null,
      lcp: lcp ? Math.round(lcp) : null,
      reqs: resources.length + 1,
      transferKB: Math.round(resources.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
    };
  });
  out.push({ name, path, ...m, wallMs: Date.now() - t0 });
  console.log(name.padEnd(22), "TTFB:", m.ttfb, "FCP:", m.fcp, "LCP:", m.lcp, "load:", m.load, "reqs:", m.reqs, "KB:", m.transferKB);
}

// public
await measure("landing-cold", "/");
await measure("landing-warm", "/");
// login
await p.fill('input[name="name"]', "PerfBot");
try { await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]); } catch {}
await p.waitForTimeout(1500);
// student routes warm nav
for (const [n, path] of [
  ["dashboard", "/dashboard"], ["learn", "/learn"], ["practice", "/practice"],
  ["missions", "/missions"], ["coding", "/coding"], ["playground", "/playground"],
  ["visualizer", "/visualizer"], ["projects", "/projects"], ["growth", "/growth"], ["exams", "/exams"],
]) {
  await measure(n + "-cold", path);
  await measure(n + "-warm", path);
}
// warm client-side nav test
const t0nav = Date.now();
await p.click('a[href="/learn"]').catch(() => {});
await p.waitForTimeout(800);
console.log("client-nav learn ~ms:", Date.now() - t0nav);

// admin login page
await p.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(800);
await measure("admin-login", "/admin/login");

console.log("ERRORS:", JSON.stringify(errs.slice(0, 10)));
writeFileSync("javoodle-performance-release/route-performance-before.json", JSON.stringify(out, null, 2));
await browser.close();
