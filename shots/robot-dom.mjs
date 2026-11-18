import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(1500);

const dump = async (label) => {
  const info = await p.evaluate(() => {
    const main = document.querySelector("main");
    const mr = main?.getBoundingClientRect();
    const kids = main ? [...main.children].map((c) => {
      const r = c.getBoundingClientRect();
      return `${c.tagName}.${(c.className||"").toString().slice(0,50)} @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
    }) : [];
    // deeper: grandchildren of first child
    const deep = main?.firstElementChild ? [...main.firstElementChild.children].slice(0,8).map((c) => {
      const r = c.getBoundingClientRect();
      return `  ${c.tagName}.${(c.className||"").toString().slice(0,45)} @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
    }) : [];
    return { main: mr ? `${Math.round(mr.x)},${Math.round(mr.y)} ${Math.round(mr.width)}x${Math.round(mr.height)}` : "none", kids, deep };
  });
  console.log(`\n=== ${label} ===\nmain: ${info.main}\nchildren:\n${info.kids.join("\n")}\ngrandchildren:\n${info.deep.join("\n")}`);
};

await dump("dashboard");
await p.locator('nav a[href="/exams"]').first().click(); await p.waitForTimeout(1200);
await dump("exams");
await p.locator('nav a[href="/coding"]').first().click(); await p.waitForTimeout(1200);
await dump("coding");
await b.close();
