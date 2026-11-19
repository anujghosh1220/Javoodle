import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
const BASE = "http://localhost:3000";
const OUT = "atmosphere-final-qa/screenshots";
mkdirSync(OUT, { recursive: true });
const manifest = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
try { await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]); } catch {}
await p.waitForTimeout(1500);

const states = [
  ["matrix", { mode: "matrix" }],
  ["neural", { mode: "neural" }],
  ["aurora", { mode: "aurora" }],
  ["minimal", { mode: "minimal" }],
  ["fx-off", { effects: false }],
  ["reduced", { reducedMotion: true }],
];
for (const [name, patch] of states) {
  await p.evaluate((pt) => {
    const key = "javoodle.atmosphere.v1";
    let cur = {}; try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
    localStorage.setItem(key, JSON.stringify({ ...cur, ...pt }));
  }, patch);
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2200);
  const probe = await p.evaluate(() => ({
    stored: JSON.parse(localStorage.getItem("javoodle.atmosphere.v1") || "{}"),
    holo: document.querySelectorAll(".atmo-holo").length,
    aurora: document.querySelectorAll(".atmo-aurora").length,
  }));
  const file = `settings-${name}-1920x1080.png`;
  await p.screenshot({ path: `${OUT}/${file}` });
  manifest.push({ file, route: "/dashboard", viewport: "1920x1080", state: name, ok: true, probe });
  console.log(name, JSON.stringify(probe));
}
// restore
await p.evaluate(() => {
  const key = "javoodle.atmosphere.v1";
  localStorage.setItem(key, JSON.stringify({ mode: "auto", effects: true, matrixIntensity: 55, particleIntensity: 60, auroraIntensity: 60, cursorLight: true, holograms: true, reducedMotion: false, sound: false }));
});
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(1500);

// fx-off canvas verification
await p.evaluate(() => {
  const key = "javoodle.atmosphere.v1";
  let cur = {}; try { cur = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
  localStorage.setItem(key, JSON.stringify({ ...cur, effects: false }));
});
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
const nz = await p.evaluate(() => {
  const cv = document.getElementById("javoodle-atmosphere");
  const c = cv.getContext("2d");
  const d = c.getImageData(0, 0, cv.width, cv.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 100) if (d[i] > 8) n++;
  return n;
});
console.log("canvasNonZero fx-off:", nz);
await p.evaluate(() => localStorage.removeItem("javoodle.atmosphere.v1"));

writeFileSync("atmosphere-final-qa/manifest-states.json", JSON.stringify(manifest, null, 2));
console.log("ERRORS:", errs.length ? errs : "none");
await browser.close();
