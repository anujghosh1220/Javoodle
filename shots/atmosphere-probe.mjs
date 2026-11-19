import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1500);

async function probe(path, label) {
  await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1600);
  const r = await p.evaluate(() => {
    const cv = document.getElementById("javoodle-atmosphere");
    let variance = -1;
    if (cv) {
      const c = cv.getContext("2d");
      const d = c.getImageData(0, 0, Math.min(cv.width, 400), Math.min(cv.height, 300)).data;
      let sum = 0, sum2 = 0, n = 0;
      for (let i = 3; i < d.length; i += 16) { const v = d[i]; sum += v; sum2 += v * v; n++; }
      const mean = sum / n;
      variance = sum2 / n - mean * mean;
    }
    const aurora = document.querySelectorAll(".atmo-aurora").length;
    const holo = document.querySelectorAll(".atmo-holo").length;
    const overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    return { canvas: !!cv, variance: Math.round(variance), aurora, holo, overflowX };
  });
  console.log(label.padEnd(14), JSON.stringify(r));
}

await probe("/", "landing");
await p.fill('input[name="name"]', "Ava").catch(() => {});
await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1500);
// login if redirected
if (p.url().endsWith("/")) {
  await p.fill('input[name="name"]', "Ava");
  await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
  await p.waitForTimeout(1200);
}
for (const [n, path] of [["dashboard","/dashboard"],["learn","/learn"],["practice","/practice"],["coding","/coding"],["playground","/playground"],["growth","/growth"],["exams","/exams"]]) {
  await probe(path, n);
}
// exam take: find an exam link then take link
await p.goto(BASE + "/exams", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
const take = await p.$('a[href*="/take"]');
if (take) {
  const href = await take.getAttribute("href");
  await probe(href, "exam-take");
} else console.log("exam-take: no take link found");
// prefs persistence check
await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
const stored = await p.evaluate(() => localStorage.getItem("javoodle.atmosphere.v1"));
console.log("prefs stored:", stored);
await browser.close();
