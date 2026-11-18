import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(2000);

// park robot center for clean shots
await p.evaluate(() => { const br = window.__robotBrain; br.paused = false; br.x = 720; br.y = 700; br.facing = 1; });
await p.waitForTimeout(400);

// viewBox bounds in local units
const VB = { x: -30, y: -16, w: 160, h: 200 };

const checkParts = () => p.evaluate((VB) => {
  const svg = document.querySelector("[data-companion] svg[aria-label]");
  if (!svg) return { err: "no svg" };
  // union of each part's parent-group bbox (includes the part's own transform,
  // expressed in svg user units ~= viewBox coords, modulo the root pose transform)
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const parts = [];
  for (const g of svg.querySelectorAll("[data-part]")) {
    if (g.getAttribute("data-part") === "root") continue; // parent is <svg>
    const host = g.parentElement;
    if (!host || typeof host.getBBox !== "function") continue;
    const bb = host.getBBox();
    x0 = Math.min(x0, bb.x); y0 = Math.min(y0, bb.y);
    x1 = Math.max(x1, bb.x + bb.width); y1 = Math.max(y1, bb.y + bb.height);
    parts.push(g.getAttribute("data-part"));
  }
  const bad = [];
  if (x0 < VB.x - 0.5 || y0 < VB.y - 0.5 || x1 > VB.x + VB.w + 0.5 || y1 > VB.y + VB.h + 0.5) {
    bad.push(`union [${x0.toFixed(1)},${y0.toFixed(1)} -> ${x1.toFixed(1)},${y1.toFixed(1)}] vs viewBox [${VB.x},${VB.y} ${VB.w}x${VB.h}]`);
  }
  return { bad, union: `[${x0.toFixed(0)},${y0.toFixed(0)} ${x1.toFixed(0)},${y1.toFixed(0)}]`, n: parts.length };
}, VB);

const states = ["idle", "walk", "run", "turn", "wave", "look", "sit", "sleep", "wake", "jump", "celebrate", "dance", "curious", "think", "interact"];
const shotFor = { walk: "v2b-walk", wave: "v2b-wave", dance: "v2b-dance", celebrate: "v2b-celebrate", jump: "v2b-jump", sit: "v2b-sit", sleep: "v2b-sleep" };

for (const st of states) {
  await p.evaluate((st) => {
    const br = window.__robotBrain;
    br.state = st; br.stateT = 0; br.stateLimit = 30; br.target = null;
    if (st === "walk" || st === "run") { br.x = 720; br.y = 700; br.target = { x: 900, y: 700 }; br.moveSpeed = st === "run" ? 120 : 46; }
    if (st === "turn") { br.facing = -1; br.turnT = 0.3; br.target = { x: 500, y: 700 }; }
  }, st);
  await p.waitForTimeout(900); // let smoothing settle mid-pose
  const res = await checkParts();
  console.log(st.padEnd(11), res.bad && res.bad.length ? "CLIPPED: " + res.bad.join(" | ") : "ok  union=" + res.union);
  if (shotFor[st]) {
    const bb = await p.locator("[data-companion] svg[aria-label]").boundingBox();
    if (bb) await p.screenshot({ path: `shots/${shotFor[st]}.png`, clip: { x: Math.max(0, bb.x - 120), y: Math.max(0, bb.y - 140), width: 340, height: 340 } });
  }
}
console.log("errors:", errs.length ? errs.slice(0, 5) : "none");
await b.close();
