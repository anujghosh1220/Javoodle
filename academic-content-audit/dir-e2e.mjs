import { chromium } from "playwright";
import { readFileSync } from "fs";
const cred = JSON.parse(readFileSync("academic-content-audit/.dir-admin.json","utf8"));
const base = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const results = [];
const check = (name, ok, extra="") => { results.push({name, ok, extra}); console.log((ok?"PASS":"FAIL"), name, extra); };

// 1. unauthenticated redirect
await page.goto(base + "/admin/students", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
check("unauth redirected to login", page.url().includes("/admin/login"), page.url());

// 2. admin login
await page.goto(base + "/admin/login", { waitUntil: "domcontentloaded" });
await page.waitForSelector("input[type=email], input[name=email]", { timeout: 15000 });
await page.fill("input[type=email], input[name=email]", cred.email);
await page.fill("input[type=password], input[name=password]", cred.password);
await page.click("button[type=submit]");
await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20000 }).catch(()=>{});
await page.waitForTimeout(1500);
check("admin login", page.url().includes("/admin") && !page.url().includes("login"), page.url());

// 3. students directory
await page.goto(base + "/admin/students", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const body = await page.textContent("body");
check("directory renders", body.includes("Student directory"), "");
check("students listed", /Anuj Ghosh|David|Ava|Poornika/.test(body), "");
await page.screenshot({ path: "academic-content-audit/shots/directory.png", fullPage: false });

// 4. search
await page.fill("input[name=q]", "anuj");
await page.click("button[type=submit]");
await page.waitForTimeout(2500);
const b2 = await page.textContent("body");
check("search filters", b2.includes("Anuj Ghosh") && !b2.includes("Poornika"), "");
await page.screenshot({ path: "academic-content-audit/shots/search.png" });

// 5. detail page
await page.goto(base + "/admin/students", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.click("text=Anuj Ghosh");
await page.waitForTimeout(2500);
const b3 = await page.textContent("body");
check("detail page", b3.includes("Registered") && b3.includes("Recent"), page.url());
await page.screenshot({ path: "academic-content-audit/shots/detail.png" });

// 6. student cannot access (no student cookie -> treated as unauth)
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(base + "/admin/students", { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(2000);
check("non-admin blocked", p2.url().includes("/admin/login"), p2.url());

console.log(JSON.stringify(results.filter(r=>!r.ok)));
await browser.close();
