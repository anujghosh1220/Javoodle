import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("PAGEERR", e.message));

// login
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
try { await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]); } catch {}
await p.waitForTimeout(1500);

async function measureFps(label) {
  const fps = await p.evaluate(() => new Promise((res) => {
    let frames = 0; const t0 = performance.now();
    const tick = () => { frames++; if (performance.now() - t0 < 5000) requestAnimationFrame(tick); else res(Math.round(frames / ((performance.now() - t0) / 1000) * 10) / 10); };
    requestAnimationFrame(tick);
  }));
  console.log(label, "FPS:", fps);
}
async function canvasNonZero(label) {
  const n = await p.evaluate(() => {
    const cv = document.getElementById("javoodle-atmosphere");
    if (!cv) return "no-canvas";
    const c = cv.getContext("2d");
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    let nz = 0;
    for (let i = 3; i < d.length; i += 400) if (d[i] > 8) nz++;
    return nz;
  });
  console.log(label, "canvasNonZeroSamples:", n);
}

// baseline effects ON
await canvasNonZero("effects-ON ");
await measureFps("effects-ON ");

// effects OFF via localStorage + reload
await p.evaluate(() => {
  const key = "javoodle.atmosphere.v1";
  let cur = {}; try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  localStorage.setItem(key, JSON.stringify({ ...cur, effects: false }));
});
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
await canvasNonZero("effects-OFF");
await measureFps("effects-OFF");

// inspect engine state via DOM: is overlay hidden? canvas CSS?
const info = await p.evaluate(() => {
  const cv = document.getElementById("javoodle-atmosphere");
  return {
    w: cv?.width, h: cv?.height,
    style: cv?.style.cssText,
    aurora: document.querySelectorAll(".atmo-aurora").length,
    holo: document.querySelectorAll(".atmo-holo").length,
  };
});
console.log("DOM info:", JSON.stringify(info));

// back ON
await p.evaluate(() => {
  const key = "javoodle.atmosphere.v1";
  let cur = {}; try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  localStorage.setItem(key, JSON.stringify({ ...cur, effects: true }));
});
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
await canvasNonZero("effects-ON2");
await measureFps("effects-ON2");

await browser.close();
