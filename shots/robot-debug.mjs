import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(2000);

// is rAF running at all?
const rafAlive = await p.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else res(n); };
  requestAnimationFrame(tick);
}));
console.log("rAF frames/sec:", rafAlive, "hidden:", await p.evaluate(() => document.hidden));

// sample transform + leg + activeElement + selection over 8s
for (let i = 0; i < 8; i++) {
  const s = await p.evaluate(() => {
    const w = document.querySelector("[data-companion]");
    const leg = document.querySelector('[data-companion] [data-part="legL"]');
    const root = document.querySelector('[data-companion] [data-part="root"]');
    return {
      t: w?.style.transform,
      leg: leg?.getAttribute("transform"),
      root: root?.getAttribute("transform")?.slice(0, 80),
      ae: document.activeElement?.tagName,
      sel: window.getSelection()?.isCollapsed,
    };
  });
  console.log(i, JSON.stringify(s));
  await p.waitForTimeout(1000);
}
console.log("errors:", errs.slice(0, 5));
await b.close();
