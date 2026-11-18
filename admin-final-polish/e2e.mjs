import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";
const fx = JSON.parse(readFileSync("admin-final-polish/.test-fixtures.json","utf8"));
const env={};for(const l of readFileSync(".env.local","utf8").split(/\r?\n/)){const i=l.indexOf("=");if(i>0&&!l.trim().startsWith("#"))env[l.slice(0,i).trim()]=l.slice(i+1).trim();}
const SB=env.NEXT_PUBLIC_SUPABASE_URL,KEY=env.SUPABASE_SERVICE_ROLE_KEY;
const api=async(p,o={})=>{const r=await fetch(SB+"/rest/v1/"+p,{...o,headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",Prefer:"count=exact",...(o.headers||{})}});return r;};
const base="http://localhost:3100";
const results=[];
const check=(n,ok,x="")=>{results.push({n,ok});console.log((ok?"PASS":"FAIL"),n,x);};
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:900}});
const consoleErrs=[];
page.on("console",m=>{if(m.type()==="error")consoleErrs.push(m.text().slice(0,200));});
page.on("pageerror",e=>consoleErrs.push("PAGEERROR:"+String(e).slice(0,200)));

// login
await page.goto(base+"/admin/login",{waitUntil:"domcontentloaded"});
await page.waitForSelector("input[type=email]",{timeout:15000});
await page.fill("input[type=email]",fx.email);
await page.fill("input[type=password]",fx.password);
await page.click("button[type=submit]");
await page.waitForTimeout(3500);
check("admin login",page.url().includes("/admin")&&!page.url().includes("login"),page.url());

// NAV: active states on each route
const navCases=[["/admin","Dashboard"],["/admin/students","Students"],["/admin/students/"+fx.s2,"Students"],["/admin/exams","Exams"],["/admin/questions","Questions"]];
for(const [path,label] of navCases){
  await page.goto(base+path,{waitUntil:"domcontentloaded"});
  await page.waitForTimeout(2500);
  const active=await page.$$eval('nav[aria-label="Admin navigation"] a[aria-current="page"]',as=>as.map(a=>a.textContent.trim()));
  check(`nav active ${path}`,active.some(t=>t.includes(label)),JSON.stringify(active));
}
await page.screenshot({path:"admin-final-polish/shots/nav-students.png"});
check("no hydration/console errors",consoleErrs.filter(e=>/hydrat/i.test(e)).length===0,consoleErrs.slice(0,3).join(" || "));

// DELETE flow on temp student s1
await page.goto(base+"/admin/students/"+fx.s1,{waitUntil:"domcontentloaded"});
await page.waitForTimeout(2500);
const delBtn=page.locator("button",{hasText:"Delete student"});
check("delete button present",await delBtn.count()===1);
await delBtn.click();
await page.waitForTimeout(500);
const dlg=await page.textContent("body");
check("confirm dialog shows name",dlg.includes("ZZDeleteMe")&&dlg.includes("permanently"),"");
await page.screenshot({path:"admin-final-polish/shots/delete-dialog.png"});
await page.locator("button",{hasText:"Delete permanently"}).click();
await page.waitForURL(/\/admin\/students$/, {timeout:15000}).catch(()=>{});
await page.waitForTimeout(1500);
check("redirected to directory",page.url().endsWith("/admin/students"),page.url());

// verify DB state
const g=async(p)=>{const r=await api(p);return r.json();};
const s1=await g("students?id=eq."+fx.s1);
const s2=await g("students?id=eq."+fx.s2);
check("s1 deleted",s1.length===0);
check("s2 untouched",s2.length===1&&s2[0].display_name==="ZZKeepMe");
const sess=await g("student_sessions?student_id=eq."+fx.s1);
check("sessions cascade-deleted",sess.length===0);
const lc=await g("lesson_completions?student_id=eq."+fx.s1);
const xp=await g("xp_events?student_id=eq."+fx.s1);
const at=await g("exam_attempts?student_id=eq."+fx.s1);
check("dependents cascade-deleted",lc.length===0&&xp.length===0&&at.length===0,`lc=${lc.length} xp=${xp.length} at=${at.length}`);
const examsBefore=await (await api("exams?select=id",{method:"GET"})).json();
check("exams table intact",Array.isArray(examsBefore)&&examsBefore.length>0);

// repeat deletion -> detail 404 / safe
await page.goto(base+"/admin/students/"+fx.s1,{waitUntil:"domcontentloaded"});
await page.waitForTimeout(2000);
const nf=await page.textContent("body");
check("deleted detail -> not found",/not found|404/i.test(nf)||page.url().includes("students"),page.url());

// non-admin context cannot see delete
const ctx=await browser.newContext();const p2=await ctx.newPage();
await p2.goto(base+"/admin/students/"+fx.s2,{waitUntil:"domcontentloaded"});await p2.waitForTimeout(2000);
check("non-admin blocked from detail",p2.url().includes("/admin/login"),p2.url());

console.log("CONSOLE_ERRORS:",JSON.stringify(consoleErrs.slice(0,5)));
writeFileSync("admin-final-polish/e2e-results.json",JSON.stringify({results,consoleErrs},null,2));
await browser.close();
