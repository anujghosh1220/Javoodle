import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const SEL = 'button, a[href], input, textarea, select, [role="button"], [contenteditable="true"], nav, .monaco-editor, [data-keep-clear]';
  const out = [];
  let area = 0;
  for (const el of document.querySelectorAll(SEL)) {
    if (el.closest("[data-companion]") || el.closest("[data-companion-controls]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue;
    area += r.width * r.height;
    out.push(`${el.tagName}.${(el.className||"").toString().slice(0,40)} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return { count: out.length, area, vw: innerWidth, vh: innerHeight, sample: out.slice(0, 25) };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
