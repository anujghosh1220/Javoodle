import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
async function measure(name, path, w, h, authed) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  if (authed) {
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    await p.fill('input[name="name"]', "Ava");
    await p.click('button[type="submit"]');
    await p.waitForTimeout(1500);
  }
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  const m = await p.evaluate(() => {
    const el = document.querySelector("main") || document.body;
    const r = el.getBoundingClientRect();
    const overflowX = document.documentElement.scrollWidth > window.innerWidth;
    // rightmost painted content edge
    let right = 0;
    document.querySelectorAll("main *").forEach(n => {
      const b = n.getBoundingClientRect();
      if (b.width > 0 && b.right > right && b.right <= window.innerWidth + 1) right = b.right;
    });
    return { vw: window.innerWidth, mainW: Math.round(r.width), mainLeft: Math.round(r.left), mainRight: Math.round(r.right), contentRight: Math.round(right), overflowX, scrollH: document.documentElement.scrollHeight, vh: window.innerHeight };
  });
  console.log(name.padEnd(16), JSON.stringify(m));
  await ctx.close();
}
await measure("landing-2048", "/", 2048, 1152);
await measure("dashboard-2048", "/dashboard", 2048, 1152, true);
await measure("learn-2048", "/learn", 2048, 1152, true);
await measure("practice-2048", "/practice", 2048, 1152, true);
await measure("exams-2048", "/exams", 2048, 1152, true);
await measure("coding-2048", "/coding", 2048, 1152, true);
await measure("exams-1920", "/exams", 1920, 1080, true);
await measure("coding-1920", "/coding", 1920, 1080, true);
await browser.close();
