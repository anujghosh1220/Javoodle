import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

const shot = (n) => p.screenshot({ path: `shots/v4-${n}.png`, fullPage: false });

await p.goto(BASE + "/", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
await shot("landing");

// student flow
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 20000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(1500);
await shot("dashboard");
for (const [n, path] of [["exams", "/exams"], ["coding", "/coding"], ["learn", "/learn"], ["practice", "/practice"], ["growth", "/growth"], ["playground", "/playground"]]) {
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  await shot(n);
}

// admin (unauthenticated -> login page expected)
await p.goto(BASE + "/admin", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
await shot("admin-gate");
await p.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
await p.waitForTimeout(600);
await shot("admin-login");

// mobile viewport spot check
await ctx.close();
const m = await b.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto(BASE + "/", { waitUntil: "networkidle" });
await mp.waitForTimeout(1000);
await mp.screenshot({ path: "shots/v4-landing-mobile.png" });
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
console.log("mobile horizontal overflow:", overflow);

console.log("errors:", errs.length ? errs.slice(0, 6) : "none");
await b.close();
