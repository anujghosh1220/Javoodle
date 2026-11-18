import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(2500);
const seen = new Set(); let oob = 0, ov = 0;
for (let i = 0; i < 10; i++) {
  seen.add(await p.locator("[data-companion]").evaluate((el) => el.style.transform));
  const bb = await p.locator("[data-companion] svg[aria-label]").boundingBox();
  if (bb && (bb.x < -8 || bb.y < -8 || bb.x + bb.width > 1448 || bb.y + bb.height > 908)) oob++;
  const hits = await p.evaluate(() => {
    const svg = document.querySelector("[data-companion] svg[aria-label]");
    if (!svg) return null;
    const r = svg.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2; const out = [];
    for (const el of document.querySelectorAll("main section, main article, main .rounded-card, main header, main footer, .monaco-editor, nav")) {
      const b2 = el.getBoundingClientRect();
      if (cx > b2.x && cx < b2.x + b2.width && cy > b2.y && cy < b2.y + b2.height) out.push(1);
    }
    return out.length;
  });
  if (hits) ov += hits;
  await p.waitForTimeout(1300);
}
console.log("positions:", seen.size, "| oob:", oob, "| content-overlaps:", ov, "| companions:", await p.locator('svg[aria-label="Javoodle robot mascot"]:visible').count());
await p.screenshot({ path: "shots/v3-dashboard.png" });
console.log("errors:", errs.length ? errs.slice(0, 5) : "none");
await b.close();
