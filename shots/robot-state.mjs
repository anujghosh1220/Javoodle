import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(1500);
for (let i = 0; i < 14; i++) {
  const s = await p.evaluate(() => {
    const br = window.__robotBrain;
    if (!br) return null;
    return {
      state: br.state, x: Math.round(br.x), y: Math.round(br.y),
      facing: br.facing, mood: br.mood, paused: br.paused, restricted: br.restricted,
      distracted: br.distracted, tgt: br.target ? `${Math.round(br.target.x)},${Math.round(br.target.y)}` : null,
      dwell: +br.dwell?.toFixed(2), stateT: +br.stateT?.toFixed(2), stateLimit: br.stateLimit === Infinity ? "inf" : +br.stateLimit?.toFixed(2),
      esc: br.escaping,
    };
  });
  console.log(i, JSON.stringify(s));
  await p.waitForTimeout(900);
}
console.log("errors:", errs.slice(0, 5));
await b.close();
