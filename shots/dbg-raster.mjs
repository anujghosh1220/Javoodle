import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await p.fill('input[name="name"]', "Ava");
await Promise.all([p.waitForURL("**/dashboard", { timeout: 25000 }), p.click('button[type="submit"]')]);
await p.waitForTimeout(2000);
await p.evaluate(() => { const br = window.__robotBrain; br.x = 720; br.y = 700; });

const rasterCheck = () => p.evaluate(async () => {
  const svg = document.querySelector("[data-companion] svg[aria-label]");
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const w = 320, h = Math.round(w * 210 / 184);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const edge = 3; // px margin
  let top = 0, bottom = 0, left = 0, right = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 10) {
      if (y < edge) top++; if (y >= h - edge) bottom++;
      if (x < edge) left++; if (x >= w - edge) right++;
    }
  }
  return { top, bottom, left, right };
});

const states = ["idle","walk","run","wave","look","sit","sleep","wake","jump","celebrate","dance","curious","think","interact","turn"];
for (const st of states) {
  await p.evaluate((st) => {
    const br = window.__robotBrain;
    br.state = st; br.stateT = 0; br.stateLimit = 30; br.target = null;
    if (st === "walk" || st === "run") { br.x = 720; br.y = 700; br.target = { x: 900, y: 700 }; br.moveSpeed = st === "run" ? 120 : 46; }
    if (st === "turn") { br.facing = -1; br.turnT = 0.3; br.target = { x: 500, y: 700 }; }
  }, st);
  await p.waitForTimeout(900);
  const r = await rasterCheck();
  const clipped = r.top + r.bottom + r.left + r.right > 0;
  console.log(st.padEnd(11), clipped ? `EDGE PIXELS t${r.top} b${r.bottom} l${r.left} r${r.right}` : "clean");
}
await b.close();
