import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 2048, height: 1152 } });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", e => errors.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
const t0 = Date.now();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.waitForSelector('input[name="name"]');
const fcp = await p.evaluate(() => performance.getEntriesByType("paint").map(e => `${e.name}:${Math.round(e.startTime)}ms`).join(" "));
await p.fill('input[name="name"]', "Ava");
await Promise.all([
  p.waitForURL("**/dashboard", { timeout: 20000 }),
  p.click('button[type="submit"]'),
]);
console.log("login -> dashboard OK in", Date.now() - t0, "ms |", fcp);
await p.waitForTimeout(1500);
await p.screenshot({ path: "shots/dashboard-2048.png" });
// dashboard metrics
const m = await p.evaluate(() => {
  const main = document.querySelector("main");
  const r = main?.getBoundingClientRect();
  return { mainW: r && Math.round(r.width), overflowX: document.documentElement.scrollWidth > innerWidth, bg: getComputedStyle(document.body).backgroundColor };
});
console.log("dashboard:", JSON.stringify(m));
// nav timing to other pages
for (const [n, path] of [["learn","/learn"],["practice","/practice"],["exams","/exams"],["coding","/coding"],["growth","/growth"],["playground","/playground"]]) {
  const t = Date.now();
  await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("networkidle").catch(()=>{});
  console.log(n, Date.now() - t, "ms");
}
console.log("JS errors:", errors.length ? errors.slice(0,5) : "none");
await browser.close();
