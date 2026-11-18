import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(2000);
for (let i = 0; i < 10; i++) {
  const s = await p.evaluate(() => {
    const br = window.__robotBrain;
    return br ? { st: br.state, x: Math.round(br.x), y: Math.round(br.y), esc: br.escaping, tgt: br.target ? 1 : 0, paused: br.paused, dist: br.distracted, res: br.restricted } : null;
  });
  console.log(i, JSON.stringify(s));
  await p.waitForTimeout(1000);
}
await b.close();
