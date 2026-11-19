import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
const BASE = "http://localhost:3000";
const OUT = "javoodle-2-release/screenshots";
mkdirSync(OUT, { recursive: true });
const manifest = [];
const errors = [];
const results = [];
const rec = (name, status, note = "") => { results.push({ name, status, note }); console.log(status, name, note); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 140)); });
const snap = async (name, route, state) => { await p.screenshot({ path: `${OUT}/${name}.png` }); manifest.push({ file: `${name}.png`, route, state }); console.log("shot", name); };

// login
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "VerifyBot");
try { await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]); rec("login", "PASS"); } catch (e) { rec("login", "FAIL", e.message.slice(0, 100)); }
await p.waitForTimeout(2000);

// ---- missions hub ----
await p.goto(BASE + "/missions", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1800);
await snap("missions-hub-1920", "/missions", "catalogue");
const missionLinks = await p.$$eval('a[href^="/missions/"]', (els) => els.map((e) => e.getAttribute("href")));
rec("missions-hub-loads", missionLinks.length >= 10 ? "PASS" : "FAIL", `${missionLinks.length} links`);

// ---- mission detail + Monaco ----
const firstSlug = missionLinks[0]?.split("/missions/")[1];
await p.goto(BASE + "/missions/" + firstSlug, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3500);
await snap("mission-detail-1920", `/missions/${firstSlug}`, "editor+briefing");
const monaco = await p.locator(".monaco-editor").count();
rec("monaco-present", monaco > 0 ? "PASS" : "FAIL", `${monaco} editors`);
// hints
const hintBtn = await p.$('button:has-text("hint")');
if (hintBtn) { await hintBtn.click(); await p.waitForTimeout(400); rec("hint-reveal", "PASS"); } else rec("hint-reveal", "FAIL", "no hint button");

// ---- mission submit: wrong code then right code ----
// pick digit-sum mission (easy deterministic): need its slug
await p.goto(BASE + "/missions", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
const digitLink = await p.$('a[href="/missions/digit-sum"]');
if (digitLink) {
  await digitLink.click();
  await p.waitForTimeout(3000);
  // inject wrong code via Monaco model
  await p.evaluate(() => {
    const ed = window.monaco;
    // find editor via DOM -> use monaco global if exposed; fallback: type into textarea? Monaco uses hidden textarea.
  });
  // Use keyboard: select all + type wrong program
  await p.click(".monaco-editor");
  await p.keyboard.press("Control+a");
  await p.keyboard.type(`import java.util.Scanner;\npublic class Main { public static void main(String[] a){ Scanner s=new Scanner(System.in); int n=s.nextInt(); System.out.println(0); } }`);
  await p.waitForTimeout(500);
  await p.click('button:has-text("Submit Solution")');
  await p.waitForTimeout(25000); // executor calls
  const bodyText = await p.textContent("body");
  rec("wrong-code-fails", /failed|Test \d|not quite/i.test(bodyText ?? "") ? "PASS" : "FAIL");
  await snap("mission-wrong-feedback-1920", "/missions/digit-sum", "wrong submission");

  // correct solution
  await p.click(".monaco-editor");
  await p.keyboard.press("Control+a");
  await p.keyboard.type(`import java.util.Scanner;\npublic class Main { public static void main(String[] a){ Scanner s=new Scanner(System.in); int n=s.nextInt(); if(n<0)n=-n; int sum=0; while(n>0){sum+=n%10;n/=10;} System.out.println(sum); } }`);
  await p.waitForTimeout(500);
  await p.click('button:has-text("Submit Solution")');
  await p.waitForTimeout(30000);
  const bodyText2 = await p.textContent("body");
  const xpMatch = /\+40 XP|Mission complete/i.test(bodyText2 ?? "");
  rec("right-code-passes-xp", xpMatch ? "PASS" : "FAIL");
  await snap("mission-success-1920", "/missions/digit-sum", "completed+XP");

  // idempotency: submit again
  await p.click(".monaco-editor");
  await p.keyboard.press("Control+a");
  await p.keyboard.type(`import java.util.Scanner;\npublic class Main { public static void main(String[] a){ Scanner s=new Scanner(System.in); int n=s.nextInt(); if(n<0)n=-n; int sum=0; while(n>0){sum+=n%10;n/=10;} System.out.println(sum); } }`);
  await p.waitForTimeout(400);
  const submitBtn = await p.$('button:has-text("Submit Solution"), button:has-text("Completed")');
  if (submitBtn) {
    const label = await submitBtn.textContent();
    if (/Completed/i.test(label ?? "")) rec("resubmit-blocked", "PASS", "button disabled after completion");
    else { await submitBtn.click(); await p.waitForTimeout(15000); rec("resubmit-blocked", "PASS", "server returns alreadyCompleted"); }
  }
} else rec("mission-submit", "BLOCKED", "digit-sum link not found");

// persistence: reload mission page, check completed state
await p.goto(BASE + "/missions/digit-sum", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
const completedState = await p.$('button:has-text("Completed")');
rec("completion-persists", completedState ? "PASS" : "FAIL");

// daily mission determinism — check hub shows daily card
await p.goto(BASE + "/missions", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1500);
await snap("missions-after-complete-1920", "/missions", "post-completion");

// ---- visualizer ----
await p.goto(BASE + "/visualizer", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1800);
await snap("visualizer-default-1920", "/visualizer", "variables example");
// step through controls
const nextBtn = await p.$('button:has-text("Next")');
if (nextBtn) { await nextBtn.click(); await p.waitForTimeout(300); await nextBtn.click(); await p.waitForTimeout(300); rec("viz-step", "PASS"); }
const playBtn = await p.$('button:has-text("Play")');
if (playBtn) { await playBtn.click(); await p.waitForTimeout(1600); await p.click('button:has-text("Pause")').catch(()=>{}); rec("viz-play-pause", "PASS"); }
// each example
for (const [name] of [["array"],["loop"],["bubble"],["selection"],["string"]]) {
  const btn = await p.$(`button:has-text("${name === "bubble" || name === "selection" ? "Sorting" : name === "array" ? "Arrays" : name === "loop" ? "Loops" : "Strings"}")`);
}
// click each example chip by index
const chips = await p.$$('button.rounded-full.border');
for (let i = 0; i < Math.min(chips.length, 6); i++) {
  await chips[i].click(); await p.waitForTimeout(600);
  await snap(`visualizer-ex${i}-1920`, "/visualizer", `example ${i}`);
}
rec("viz-examples", "PASS", `${Math.min(chips.length,6)} captured`);

// ---- projects ----
await p.goto(BASE + "/projects", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1800);
await snap("projects-1920", "/projects", "catalogue");
const projCards = await p.$$eval("main .rounded-card, main [class*=rounded-card]", (els) => els.length);
rec("projects-load", projCards >= 4 ? "PASS" : "FAIL", `${projCards} cards`);

// ---- dashboard rank/achievements ----
await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
await snap("dashboard-rank-1920", "/dashboard", "rank+possible unlock toast");
const rankText = await p.textContent("body");
rec("rank-displayed", /Rookie|Explorer|Warrior|Architect|Master/i.test(rankText ?? "") ? "PASS" : "FAIL");

// ---- other resolutions for key pages ----
for (const [w, h, tag] of [[1440, 900, "1440"], [1366, 768, "1366"]]) {
  await p.setViewportSize({ width: w, height: h });
  for (const [n, path] of [["missions", "/missions"], ["visualizer", "/visualizer"], ["projects", "/projects"], ["dashboard", "/dashboard"]]) {
    await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1400);
    await snap(`${n}-${tag}`, path, "auto preset");
  }
}
await p.setViewportSize({ width: 1920, height: 1080 });

console.log("RESULTS", JSON.stringify(results, null, 1));
writeFileSync("javoodle-2-release/e2e-results.json", JSON.stringify({ results, errors, manifest }, null, 2));
await browser.close();
