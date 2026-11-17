import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const shots = [
  ["landing-2048", "/", 2048, 1152],
  ["landing-1920", "/", 1920, 1080],
  ["landing-1440", "/", 1440, 900],
];
const browser = await chromium.launch();
// landing shots (no session)
for (const [name, path, w, h] of shots) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `shots/${name}.png` });
  await ctx.close();
}
// login once, then student pages
const ctx = await browser.newContext({ viewport: { width: 2048, height: 1152 } });
const p = await ctx.newPage();
await p.goto(BASE + "/", { waitUntil: "networkidle" });
await p.fill('input[name="name"]', "Ava");
await p.click('button[type="submit"]');
await p.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1200);
await p.screenshot({ path: "shots/dashboard-2048.png" });
for (const [name, path] of [["learn-2048","/learn"],["practice-2048","/practice"],["exams-2048","/exams"],["coding-2048","/coding"],["growth-2048","/growth"]]) {
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `shots/${name}.png` });
}
// exam take + admin at 1920
const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p2 = await ctx2.newPage();
// reuse cookies from ctx
const cookies = await ctx.cookies();
await ctx2.addCookies(cookies);
await p2.goto(BASE + "/exams", { waitUntil: "networkidle" });
await p2.waitForTimeout(600);
await p2.screenshot({ path: "shots/exams-1920.png" });
await p2.goto(BASE + "/coding", { waitUntil: "networkidle" });
await p2.waitForTimeout(600);
await p2.screenshot({ path: "shots/coding-1920.png" });
await browser.close();
console.log("done");
