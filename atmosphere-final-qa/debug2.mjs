import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
try { await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]); } catch {}
await p.waitForTimeout(1500);

// set effects false via the actual UI toggle (Background effects switch)
const toggles = await p.$$('[role="switch"]');
console.log("switches:", toggles.length);
for (const t of toggles) {
  const label = await t.evaluate((el) => el.closest("button")?.textContent?.slice(0, 40));
  const checked = await t.getAttribute("aria-checked");
  console.log(" -", label, "checked:", checked);
}
// click first switch (Background effects)
await toggles[0].click();
await p.waitForTimeout(800);
console.log("stored:", await p.evaluate(() => localStorage.getItem("javoodle.atmosphere.v1")));
console.log("holo count:", await p.locator(".atmo-holo").count());
console.log("aurora count:", await p.locator(".atmo-aurora").count());
const nz = await p.evaluate(() => {
  const cv = document.getElementById("javoodle-atmosphere");
  const c = cv.getContext("2d");
  const d = c.getImageData(0, 0, cv.width, cv.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 400) if (d[i] > 8) n++;
  return n;
});
console.log("canvasNonZero after UI toggle off:", nz);
// toggle back on
await toggles[0].click();
await p.waitForTimeout(800);
const nz2 = await p.evaluate(() => {
  const cv = document.getElementById("javoodle-atmosphere");
  const c = cv.getContext("2d");
  const d = c.getImageData(0, 0, cv.width, cv.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 400) if (d[i] > 8) n++;
  return n;
});
console.log("canvasNonZero after UI toggle on:", nz2);
await browser.close();
