import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
try { await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]); } catch {}
await p.waitForTimeout(1500);

async function fps(label) {
  const r = await p.evaluate(() => new Promise((res) => {
    let frames = 0; const t0 = performance.now(); let longest = 0; let last = t0;
    const tick = (t) => { frames++; const dt = t - last; last = t; if (dt > longest) longest = dt;
      if (performance.now() - t0 < 5000) requestAnimationFrame(tick);
      else res({ fps: Math.round(frames / ((performance.now() - t0) / 1000) * 10) / 10, longestFrameMs: Math.round(longest) }); };
    requestAnimationFrame(tick);
  }));
  console.log(label, JSON.stringify(r));
}
await fps("headed-dashboard-fxon");
await p.evaluate(() => {
  const key = "javoodle.atmosphere.v1";
  let cur = {}; try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  localStorage.setItem(key, JSON.stringify({ ...cur, effects: false }));
});
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2000);
await fps("headed-dashboard-fxoff");
await browser.close();
