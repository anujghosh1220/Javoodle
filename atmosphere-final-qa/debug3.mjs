import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
try { await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]); } catch {}
await p.waitForTimeout(1500);

await p.evaluate(() => {
  const key = "javoodle.atmosphere.v1";
  let cur = {}; try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  localStorage.setItem(key, JSON.stringify({ ...cur, effects: false }));
});
console.log("before reload:", await p.evaluate(() => localStorage.getItem("javoodle.atmosphere.v1")));
await p.reload({ waitUntil: "domcontentloaded" });
for (const ms of [500, 1500, 3000]) {
  await p.waitForTimeout(ms === 500 ? 500 : ms - (ms === 1500 ? 500 : 1500));
  const s = await p.evaluate(() => ({
    stored: localStorage.getItem("javoodle.atmosphere.v1"),
    holo: document.querySelectorAll(".atmo-holo").length,
    aurora: document.querySelectorAll(".atmo-aurora").length,
  }));
  console.log(`t+${ms}ms:`, JSON.stringify(s));
}
await browser.close();
