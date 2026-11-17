import { chromium } from "playwright";
const BASE = "http://localhost:3100";
const browser = await chromium.launch();
const errors = [];
async function sess(w=1920,h=1080){
  const ctx = await browser.newContext({viewport:{width:w,height:h}});
  const p = await ctx.newPage();
  p.on("pageerror",e=>errors.push(e.message));
  p.on("console",m=>{if(m.type()==="error")errors.push(m.text().slice(0,120))});
  return {ctx,p};
}
// landing fresh
{
  const {ctx,p}=await sess();
  const t=Date.now();
  await p.goto(BASE+"/",{waitUntil:"domcontentloaded"});
  const fcp=await p.evaluate(()=>performance.getEntriesByType("paint").find(e=>e.name==="first-contentful-paint")?.startTime);
  const lcp=await p.evaluate(()=>new Promise(r=>{new PerformanceObserver(l=>{const e=l.getEntries().pop();r(e?Math.round(e.startTime):-1)}).observe({type:"largest-contentful-paint",buffered:true});setTimeout(()=>r(-1),3000)}));
  console.log("LANDING ttfb-ish:",Date.now()-t,"ms FCP:",Math.round(fcp),"LCP:",lcp);
  await ctx.close();
}
// authed flow
{
  const {ctx,p}=await sess(2048,1152);
  await p.goto(BASE+"/",{waitUntil:"domcontentloaded"});
  await p.fill('input[name="name"]',"Ava");
  const t=Date.now();
  await Promise.all([p.waitForURL("**/dashboard",{timeout:20000}),p.click('button[type="submit"]')]);
  console.log("LOGIN->DASH:",Date.now()-t,"ms");
  await p.waitForLoadState("networkidle").catch(()=>{});
  for(const [n,path] of [["exams","/exams"],["coding","/coding"],["learn","/learn"],["practice","/practice"],["growth","/growth"]]){
    const t2=Date.now();
    await p.goto(BASE+path,{waitUntil:"domcontentloaded"});
    await p.waitForLoadState("networkidle").catch(()=>{});
    console.log("NAV",n,Date.now()-t2,"ms");
  }
  // coding question page (monaco)
  await p.goto(BASE+"/coding",{waitUntil:"domcontentloaded"});
  const link=await p.$('a[href^="/coding/"]');
  if(link){const t3=Date.now();await link.click();await p.waitForLoadState("networkidle").catch(()=>{});console.log("CODING-Q load:",Date.now()-t3,"ms");}
  await ctx.close();
}
console.log("JS errors:",errors.length?errors.slice(0,6):"none");
await browser.close();
