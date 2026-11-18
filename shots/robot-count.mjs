import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input.name, input[name="name"]', "Ava").catch(async () => { await p.fill('input[name="name"]', "Ava"); });
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(2000);
const info = await p.evaluate(() => {
  return [...document.querySelectorAll('svg[aria-label="Javoodle robot mascot"]')].map((svg) => {
    let el = svg, chain = [];
    for (let i = 0; i < 6 && el; i++) { chain.push(`${el.tagName}.${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 40)}`); el = el.parentElement; }
    const r = svg.getBoundingClientRect();
    return { box: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`, chain: chain.join(" < ") };
  });
});
console.log(JSON.stringify(info, null, 1));
await b.close();
