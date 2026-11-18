import { chromium } from "playwright";
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1920,height:1080}});
const p=await ctx.newPage();
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});
await p.fill('input[name="name"]',"Ava");
await Promise.all([p.waitForURL("**/dashboard",{timeout:20000}),p.click('button[type="submit"]')]);
await p.waitForTimeout(1500);
console.log("pupils:",await p.locator('[data-pupil]').count());
await p.mouse.move(1600,200);await p.waitForTimeout(800);
console.log("transform:",await p.locator('[data-pupil]').first().getAttribute('transform'));
await p.locator('button[aria-label="Javoodle companion — click to say hi"]').click();await p.waitForTimeout(400);
console.log("post-click svg:",await p.locator('svg[aria-label*="robot"]').count());
for(const [n,path] of [["exams","/exams"],["coding","/coding"],["learn","/learn"],["practice","/practice"],["growth","/growth"],["dashboard","/dashboard"]]){
  await p.goto("http://localhost:3000"+path,{waitUntil:"domcontentloaded"});await p.waitForTimeout(600);
  console.log(n,"robots:",await p.locator('svg[aria-label*="robot"]').count());
}
console.log("errors:",errs.length?errs.slice(0,4):"none");
await b.close();
