import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(2000);

// persistence via stored reference
await p.evaluate(() => { window.__brainRef = window.__robotBrain; });
await p.locator('nav a[href="/exams"]').first().click(); await p.waitForTimeout(1500);
console.log("same brain after /exams:", await p.evaluate(() => window.__robotBrain === window.__brainRef));
await p.locator('nav a[href="/coding"]').first().click(); await p.waitForTimeout(1500);
console.log("same brain after /coding:", await p.evaluate(() => window.__robotBrain === window.__brainRef));
await p.locator('nav a[href="/dashboard"]').first().click(); await p.waitForTimeout(1500);

// cursor approach: synthetic pointermoves ~300px from robot, watch states
const seen = new Set();
for (let i = 0; i < 50; i++) {
  const st = await p.evaluate(() => {
    const br = window.__robotBrain;
    return br ? { x: br.x, y: br.y, state: br.state, cd: Math.round(br.cursorCooldown) } : null;
  });
  if (st) seen.add(st.state);
  if (st && (st.state === "interact" || st.state === "curious" || st.state === "look")) {
    console.log("APPROACH STATE:", st.state, "at iter", i);
    break;
  }
  if (st) {
    // keep pointer alive ~300px away
    await p.evaluate(([x, y]) => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y }));
    }, [st.x + 300, Math.max(80, st.y - 300)]);
  }
  await p.waitForTimeout(700);
}
console.log("states seen:", [...seen].join(","));
console.log("errors:", errs.slice(0, 5));
await b.close();
