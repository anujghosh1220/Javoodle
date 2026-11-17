import { chromium } from "playwright";
const BASE="http://localhost:3100";
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1920,height:1080}});
const p=await ctx.newPage();
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(BASE+"/",{waitUntil:"domcontentloaded"});
await p.fill('input[name="name"]',"Ava");
const t=Date.now();
await Promise.all([p.waitForURL("**/dashboard",{timeout:20000}),p.click('button[type="submit"]')]);
console.log("LOGIN->DASH:",Date.now()-t,"ms");
await p.goto(BASE+"/coding",{waitUntil:"domcontentloaded"});
await p.waitForLoadState("networkidle").catch(()=>{});
const link=await p.$('a[href^="/coding/"]');
if(link){
  const t2=Date.now();
  await link.click();
  // measure shell (domcontentloaded-ish) then editor-ready (.monaco-editor visible)
  await p.waitForSelector(".monaco-editor",{timeout:30000}).catch(()=>{});
  console.log("CODING-Q total-to-editor:",Date.now()-t2,"ms");
}
console.log("errors:",errs.length?errs.slice(0,4):"none");
await b.close();
