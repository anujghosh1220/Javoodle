import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const errs = [];

async function session(viewport) {
  const ctx = await b.newContext({ viewport });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE: " + m.text()); });
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.fill('input[name="name"]', "Ava");
  await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
  await p.waitForTimeout(2000);
  return { ctx, p };
}

const pose = (p) => p.locator("[data-companion]").evaluate((el) => ({
  t: el.style.transform,
  flip: el.querySelector("div")?.style.transform ?? "",
}));
const brain = (p) => p.evaluate(() => {
  const br = window.__robotBrain;
  return br ? { state: br.state, x: Math.round(br.x), y: Math.round(br.y) } : null;
});
const compCount = (p) => p.locator('svg[aria-label="Javoodle robot mascot"]').count();
// does robot box overlap any main content block?
const overlapsContent = (p) => p.evaluate(() => {
  const svg = document.querySelector("[data-companion] svg[aria-label]");
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const hits = [];
  for (const el of document.querySelectorAll("main section, main article, main .rounded-card, main header, main footer, .monaco-editor, nav")) {
    const b2 = el.getBoundingClientRect();
    if (cx > b2.x && cx < b2.x + b2.width && cy > b2.y && cy < b2.y + b2.height) {
      hits.push(`${el.tagName}.${(el.className||"").toString().slice(0,30)}`);
    }
  }
  return hits;
});

// ---------- 1440x900 ----------
{
  const { ctx, p } = await session({ width: 1440, height: 900 });
  console.log("== 1440x900 ==");
  console.log("companion svgs on dashboard:", await compCount(p), "(expect 1 — dashboard hero removed)");

  // roam ~20s, sample overlap + bounds
  let overlaps = 0, oob = 0;
  const seen = new Set();
  for (let i = 0; i < 14; i++) {
    const t = await pose(p); seen.add(t.t);
    const bb = await p.locator("[data-companion] svg[aria-label]").boundingBox();
    if (bb && (bb.x < -8 || bb.y < -8 || bb.x + bb.width > 1448 || bb.y + bb.height > 908)) oob++;
    const hits = await overlapsContent(p);
    if (hits && hits.length) { overlaps++; if (i % 4 === 0) console.log("  overlap:", hits[0]); }
    await p.waitForTimeout(1400);
  }
  console.log("distinct positions:", seen.size, "| out-of-bounds:", oob, "| content-overlap frames:", overlaps);
  console.log("brain:", JSON.stringify(await brain(p)));
  await p.screenshot({ path: "shots/v2-dashboard-roam.png" });

  // bubble: force one, check it doesn't cover robot
  await p.evaluate(() => { window.__robotBrain.setMood("celebrating"); });
  await p.waitForTimeout(600);
  await p.locator("[data-companion] button[aria-label*='companion']").click({ force: true });
  await p.waitForTimeout(300);
  const bubbleInfo = await p.evaluate(() => {
    const bp = document.querySelector("[data-companion] [data-side]");
    const bub = bp?.querySelector(".rounded-2xl");
    const svg = document.querySelector("[data-companion] svg[aria-label]");
    if (!bp || !bub || !svg) return null;
    const b1 = bub.getBoundingClientRect(), b2 = svg.getBoundingClientRect();
    const overlap = !(b1.bottom < b2.top || b1.top > b2.bottom || b1.right < b2.left || b1.left > b2.right);
    return { side: bp.dataset.side, overlap, bubBox: `${Math.round(b1.x)},${Math.round(b1.y)} ${Math.round(b1.width)}x${Math.round(b1.height)}`, svgBox: `${Math.round(b2.x)},${Math.round(b2.y)} ${Math.round(b2.width)}x${Math.round(b2.height)}` };
  });
  console.log("bubble:", JSON.stringify(bubbleInfo));
  await p.screenshot({ path: "shots/v2-dashboard-bubble.png" });

  // exams + coding pages
  for (const [name, href] of [["exams", "/exams"], ["coding", "/coding"]]) {
    await p.locator(`nav a[href="${href}"]`).first().click();
    await p.waitForTimeout(1800);
    console.log(`${name}: companions=${await compCount(p)} brain=${JSON.stringify(await brain(p))}`);
    let ov = 0;
    for (let i = 0; i < 5; i++) {
      const hits = await overlapsContent(p);
      if (hits && hits.length) ov++;
      await p.waitForTimeout(1200);
    }
    console.log(`  content-overlap frames: ${ov}/5`);
    await p.screenshot({ path: `shots/v2-${name}.png` });
  }
  // back to dashboard
  await p.locator('nav a[href="/dashboard"]').first().click();
  await p.waitForTimeout(1200);
  await ctx.close();
}

// ---------- smaller laptop 1280x800 ----------
{
  const { ctx, p } = await session({ width: 1280, height: 800 });
  console.log("== 1280x800 ==");
  console.log("companion svgs:", await compCount(p));
  let oob = 0, ov = 0;
  for (let i = 0; i < 8; i++) {
    const bb = await p.locator("[data-companion] svg[aria-label]").boundingBox();
    if (bb && (bb.x < -8 || bb.y < -8 || bb.x + bb.width > 1288 || bb.y + bb.height > 808)) oob++;
    const hits = await overlapsContent(p);
    if (hits && hits.length) ov++;
    await p.waitForTimeout(1200);
  }
  console.log("out-of-bounds:", oob, "| content-overlap:", ov);
  await p.screenshot({ path: "shots/v2-laptop-dashboard.png" });
  await ctx.close();
}

// ---------- reduced motion ----------
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.fill('input[name="name"]', "Ava");
  await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
  await p.waitForTimeout(2000);
  const box = await p.locator('svg[aria-label="Javoodle robot mascot"]').last().boundingBox();
  console.log("reduced-motion: companions=", await compCount(p), "box=", JSON.stringify(box));
  await p.screenshot({ path: "shots/v2-reduced.png" });
  await ctx.close();
}

console.log("errors:", errs.length ? errs.slice(0, 8) : "none");
await b.close();
console.log("DONE");
