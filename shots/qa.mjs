import { chromium } from "playwright";
const BASE="http://localhost:3000";
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1920,height:1080}});
const p=await ctx.newPage();
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(BASE+"/",{waitUntil:"domcontentloaded"});
await p.fill('input[name="name"]',"Ava");
await Promise.all([p.waitForURL("**/dashboard",{timeout:20000}),p.click('button[type="submit"]')]);
await p.waitForTimeout(1500);
const count=async()=>await p.locator('button[aria-label*="companion"]').count();
console.log("robots on dashboard:",await count());
// bubble visible?
console.log("bubble:",await p.locator('text=/adventure|back|there/i').count());
// cursor tracking: move mouse, check pupil transform
const before=await p.locator('svg[aria-label*="robot"] [data-pupil]').first().getAttribute('transform').catch(()=>null);
await p.mouse.move(300,300);await p.waitForTimeout(400);
await p.mouse.move(1500,700);await p.waitForTimeout(600);
const after=await p.locator('svg[aria-label*="robot"] [data-pupil]').first().getAttribute('transform').catch(()=>null);
console.log("pupil transform before/after:",before,"->",after);
// click robot -> reaction
await p.locator('button[aria-label*="companion"]').click();await p.waitForTimeout(300);
console.log("after click mood-bounce check (svg exists):",await p.locator('svg[aria-label*="robot"]').count());
// route persistence
for(const [n,path] of [["exams","/exams"],["coding","/coding"],["learn","/learn"],["practice","/practice"],["growth","/growth"]]){
  await p.goto(BASE+path,{waitUntil:"domcontentloaded"});await p.waitForTimeout(700);
  console.log(n,"robots:",await count());
}
console.log("errors:",errs.length?errs.slice(0,4):"none");
await b.close();
