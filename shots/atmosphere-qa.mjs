import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const OUT = "visual-qa-atmosphere";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function shot(page, name, path, w, h, authed) {
  await page.setViewportSize({ width: w, height: h });
  if (authed && path !== "/") {
    // ensure session cookie exists in this context
  }
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot", name);
}

// ---- public landing at 3 resolutions ----
for (const [w, h, tag] of [[1440, 900, "1440"], [1920, 1080, "1920"], [1366, 768, "1366"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`landing-${tag}: ${e.message}`));
  await shot(p, `landing-${tag}`, "/", w, h);
  await ctx.close();
}

// ---- authed student flow ----
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(`student: ${e.message}`));
p.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 140)}`); });

await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([
  p.waitForURL("**/dashboard", { timeout: 25000 }),
  p.click('button[type="submit"]'),
]);
await p.waitForTimeout(1500);

const pages = [
  ["dashboard", "/dashboard"],
  ["learn", "/learn"],
  ["practice", "/practice"],
  ["coding", "/coding"],
  ["playground", "/playground"],
  ["growth", "/growth"],
  ["exams", "/exams"],
];
for (const [n, path] of pages) {
  await shot(p, `student-${n}-1920`, path, 1920, 1080);
}

// 1440 + 1366 spot checks on dashboard & learn
for (const [w, h, tag] of [[1440, 900, "1440"], [1366, 768, "1366"]]) {
  await p.setViewportSize({ width: w, height: h });
  await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/student-dashboard-${tag}.png` });
  await p.goto(BASE + "/learn", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/student-learn-${tag}.png` });
  console.log("shot dashboard+learn", tag);
}
await p.setViewportSize({ width: 1920, height: 1080 });

// exam take page if reachable
const examLink = await p.$('a[href^="/exams/"]');
if (examLink) {
  const href = await examLink.getAttribute("href");
  console.log("exam link:", href);
}
// admin login page (public)
const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p2 = await ctx2.newPage();
p2.on("pageerror", (e) => errors.push(`admin: ${e.message}`));
await shot(p2, "admin-login-1920", "/admin/login", 1920, 1080);
await ctx2.close();

console.log("ERRORS:", errors.length ? errors.slice(0, 10) : "none");
await browser.close();
