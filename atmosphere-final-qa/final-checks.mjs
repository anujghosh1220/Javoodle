import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();

// OS-level reduced motion emulation
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
const p = await ctx.newPage();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1500);
const rm = await p.evaluate(() => {
  const cv = document.getElementById("javoodle-atmosphere");
  const c = cv.getContext("2d");
  const d1 = c.getImageData(0, 0, 200, 200).data.slice();
  return new Promise((res) => setTimeout(() => {
    const d2 = c.getImageData(0, 0, 200, 200).data;
    let diff = 0;
    for (let i = 0; i < d1.length; i += 400) if (Math.abs(d1[i] - d2[i]) > 4) diff++;
    res({ pixelDiffSamples: diff, aurora: document.querySelectorAll(".atmo-aurora").length, holo: document.querySelectorAll(".atmo-holo").length });
  }, 1200));
});
console.log("OS reduced-motion:", JSON.stringify(rm));
await ctx.close();

// robot aura presence on dashboard
const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p2 = await ctx2.newPage();
await p2.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p2.fill('input[name="name"]', "Ava");
try { await Promise.all([p2.waitForURL("**/dashboard", { timeout: 25000 }), p2.click('button[type="submit"]')]); } catch {}
await p2.waitForTimeout(2500);
const aura = await p2.evaluate(() => ({
  auras: document.querySelectorAll(".robot-aura").length,
  cls: document.querySelector(".robot-aura")?.className ?? null,
}));
console.log("robot aura:", JSON.stringify(aura));
await ctx2.close();
await browser.close();
