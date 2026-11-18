import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(2000);
await p.evaluate(() => { const br = window.__robotBrain; br.x = 720; br.y = 700; br.state = "interact"; br.stateT = 0; br.stateLimit = 30; });
await p.waitForTimeout(1200);
const res = await p.evaluate(() => {
  const svg = document.querySelector("[data-companion] svg[aria-label]");
  const out = [];
  for (const g of svg.querySelectorAll("[data-part]")) {
    const host = g.parentElement;
    if (!host || typeof host.getBBox !== "function") continue;
    const bb = host.getBBox();
    out.push(`${g.getAttribute("data-part")}: [${bb.x.toFixed(1)},${bb.y.toFixed(1)} ${bb.width.toFixed(1)}x${bb.height.toFixed(1)}] tf=${g.getAttribute("transform")}`);
  }
  return out;
});
console.log(res.join("\n"));
await b.close();
