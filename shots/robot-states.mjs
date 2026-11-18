import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(2000);

// park robot center-screen for clean shots
await p.evaluate(() => {
  const br = window.__robotBrain;
  br.paused = true; br.x = 720; br.y = 640; br.facing = 1;
});
const shot = async (name, fn, wait = 1200) => {
  await p.evaluate(fn);
  await p.waitForTimeout(wait);
  const bb = await p.locator("[data-companion] svg[aria-label]").boundingBox();
  await p.screenshot({ path: `shots/${name}.png`, clip: bb ? { x: Math.max(0, bb.x - 160), y: Math.max(0, bb.y - 220), width: 380, height: 380 } : undefined });
};

await shot("robot-sit", () => { const b = window.__robotBrain; b.paused = false; b.setMood("idle"); b.state = "sit"; b.stateLimit = 30; b.stateT = 0; b.sitAmt = 0; }, 1600);
await shot("robot-wave", () => { const b = window.__robotBrain; b.state = "wave"; b.stateT = 0; b.stateLimit = 30; }, 900);
await shot("robot-dance", () => { const b = window.__robotBrain; b.state = "dance"; b.stateT = 0; b.stateLimit = 30; b.setMood("excited"); }, 900);
await shot("robot-sleep", () => { const b = window.__robotBrain; b.state = "sleep"; b.stateT = 0; b.stateLimit = 30; b.sitAmt = 0; b.setMood("sleepy"); }, 2000);
await shot("robot-celebrate", () => { const b = window.__robotBrain; b.state = "celebrate"; b.stateT = 0; b.stateLimit = 30; b.setMood("celebrating"); }, 900);
console.log("done");
await b.close();
