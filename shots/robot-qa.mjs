import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE: " + m.text()); });

const companion = () => p.locator("[data-companion]");
const pose = () => companion().evaluate((el) => ({
  transform: el.style.transform,
  flip: el.querySelector("div")?.style.transform ?? "",
}));
const robotBox = () => p.locator("[data-companion] svg[aria-label]").boundingBox();
const brain = () => p.evaluate(() => {
  const br = window.__robotBrain;
  return br ? { state: br.state, x: Math.round(br.x), y: Math.round(br.y), facing: br.facing, restricted: br.restricted, mood: br.mood } : null;
});

await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(2500);

const parts = await p.locator("[data-companion] [data-part]").evaluateAll((els) => els.map((e) => e.getAttribute("data-part")));
console.log("1. body parts:", parts.join(","));

const samples = [];
for (let i = 0; i < 12; i++) { samples.push((await pose()).transform); await p.waitForTimeout(1500); }
console.log("2. distinct transforms over ~18s:", new Set(samples).size, "| states:", await brain());

const box = await robotBox();
const inView = box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1440 && box.y + box.height <= 900;
console.log("3. inside viewport:", !!inView, JSON.stringify(box));

const signs = new Set();
for (let i = 0; i < 16; i++) {
  const f = (await pose()).flip;
  const m = /scaleX\(([-\d.]+)\)/.exec(f);
  if (m) signs.add(parseFloat(m[1]) < 0 ? "left" : "right");
  await p.waitForTimeout(1300);
}
console.log("4. facing directions seen:", [...signs].join(","));

const legT = async () => p.locator('[data-companion] [data-part="legL"]').getAttribute("transform");
const lseq = [await legT()];
for (let i = 0; i < 3; i++) { await p.waitForTimeout(280); lseq.push(await legT()); }
console.log("5. legL animating:", new Set(lseq).size > 1, lseq.map((s) => s?.replace("rotate(", "").replace(")", "")).join(" -> "));

// cursor approach — keep pointer moving ~250px away from the robot's live position
let approached = false;
for (let i = 0; i < 40; i++) {
  const st = await brain();
  if (st && (st.state === "interact" || st.state === "curious" || st.state === "look")) { approached = true; break; }
  if (st) await p.mouse.move(st.x + 240, Math.max(100, st.y - 260));
  await p.waitForTimeout(800);
}
console.log("6. cursor/UI approach happened:", approached);

await p.locator("[data-companion] button[aria-label*='companion']").click({ force: true });
await p.waitForTimeout(400);
console.log("7. click ok, bubble count:", await p.locator("[data-companion] .rounded-2xl").count());

await p.locator('button[aria-label*="Pause companion"]').click();
const paused1 = await pose(); await p.waitForTimeout(2500); const paused2 = await pose();
console.log("8. pause stops movement:", paused1.transform === paused2.transform);
await p.locator('button[aria-label*="Resume companion"]').click();
await p.waitForTimeout(800);

await p.locator('button[aria-label*="Hide companion"]').click();
await p.waitForTimeout(300);
console.log("9. hidden -> companion gone:", (await companion().count()) === 0);
await p.locator('button[aria-label*="Show Javoodle"]').dispatchEvent("click");
await p.waitForTimeout(400);
console.log("   shown again:", (await companion().count()) === 1);

// navigation persistence — client-side nav keeps the same brain instance
const brainBefore = await p.evaluate(() => window.__robotBrain);
await p.locator('nav a[href="/exams"]').first().click(); await p.waitForTimeout(1800);
const brainExams = await p.evaluate(() => window.__robotBrain);
console.log("10. same brain instance /exams:", brainBefore === brainExams, "| present:", (await companion().count()) === 1, "| brain:", JSON.stringify(await brain()));

await p.locator('nav a[href="/coding"]').first().click(); await p.waitForTimeout(1800);
const brainCoding = await p.evaluate(() => window.__robotBrain);
console.log("    same brain /coding:", brainExams === brainCoding, "| present:", (await companion().count()) === 1, "| brain:", JSON.stringify(await brain()));
await p.locator('nav a[href="/dashboard"]').first().click(); await p.waitForTimeout(1800);
console.log("    back /dashboard:", (await companion().count()) === 1);

// bounds over time
let outOfBounds = 0;
for (let i = 0; i < 6; i++) {
  const bb = await p.locator("[data-companion] svg[aria-label]").boundingBox();
  if (bb && (bb.x < -8 || bb.y < -8 || bb.x + bb.width > 1448 || bb.y + bb.height > 908)) outOfBounds++;
  await p.waitForTimeout(1200);
}
console.log("11. out-of-bounds samples:", outOfBounds, "/6");

// exam attempt restricted mode (best effort)
try {
  await p.goto(BASE + "/exams", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1200);
  const examLink = p.locator('a[href*="/exams/"]').first();
  if (await examLink.count()) {
    await examLink.click(); await p.waitForTimeout(1200);
    const startBtn = p.locator('button:has-text("Start examination"), button:has-text("start the exam")').first();
    if (await startBtn.count()) {
      await startBtn.click(); await p.waitForTimeout(2500);
      if (/\/take/.test(p.url())) {
        const st1 = await brain();
        const pos1 = (await pose()).transform;
        await p.waitForTimeout(4000);
        const pos2 = (await pose()).transform;
        const st2 = await brain();
        console.log("12. exam take restricted:", st1?.restricted, "| parked:", pos1 === pos2, "| states:", st1?.state, "->", st2?.state);
      } else console.log("12. exam start did not reach /take:", p.url());
    } else console.log("12. no start button on exam page");
  } else console.log("12. no exams listed");
} catch (e) { console.log("12. exam check failed:", e.message.slice(0, 120)); }

await p.screenshot({ path: "shots/robot-roam.png" });
console.log("errors:", errs.length ? errs.slice(0, 6) : "none");

// reduced-motion context
const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const p2 = await ctx2.newPage();
await p2.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p2.fill('input[name="name"]', "Ava");
await Promise.all([p2.waitForURL("**/dashboard", { timeout: 25000 }), p2.click('button[type="submit"]')]);
await p2.waitForTimeout(2000);
const rmParts = await p2.locator('svg[aria-label="Javoodle robot mascot"]').count();
const rmBox = await p2.locator('svg[aria-label="Javoodle robot mascot"]').last().boundingBox();
const t1 = await p2.evaluate(() => document.querySelector("button[aria-label*='companion']")?.closest("div")?.style.transform ?? "none");
await p2.waitForTimeout(2000);
const t2 = await p2.evaluate(() => document.querySelector("button[aria-label*='companion']")?.closest("div")?.style.transform ?? "none");
console.log("13. reduced-motion: svg count:", rmParts, "| box:", JSON.stringify(rmBox), "| static:", t1 === t2);
await p2.screenshot({ path: "shots/robot-reduced.png" });
await ctx2.close();
await b.close();
