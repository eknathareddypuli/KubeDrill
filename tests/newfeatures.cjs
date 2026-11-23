const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1300,height:850}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++};
const run=async(c)=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await pg.waitForTimeout(150);if(await pg.locator('.br-pop').count())await pg.press('#lrIn','Enter');await pg.waitForTimeout(250)};
await pg.goto(BASE);await pg.waitForTimeout(800);await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});

// decoder
await pg.goto(BASE+'#decode');await pg.waitForSelector('#decIn');
await pg.fill('#decIn','Back-off pulling image "nginx:nope"\nErrImagePull');await pg.waitForTimeout(400);
let t=await pg.locator('#decOut').innerText();ok(/image/i.test(t)&&t.length>80,'decoder explains a pasted image-pull error');
await pg.fill('#decIn','zzz nothing known here');await pg.waitForTimeout(400);
ok((await pg.locator('#decOut').innerText()).length>0,'decoder answers (no crash) on unknown text');

// drills: command drill
await pg.goto(BASE+'#drills');await pg.waitForSelector('#drGo');await pg.click('#drGo');await pg.waitForSelector('#drIn,#drT');
ok(await pg.locator('#drT').count()===1,'command drill shows a timer');
ok(await pg.locator('#drSkip').count()===1,'skip available');
await pg.click('#drSkip');await pg.waitForTimeout(400);
ok((await pg.locator('.dr-card,#drillRoot').first().innerText()).length>20,'skip reveals the model answer / moves on');
// doc race
if(await pg.locator('#drQuit').count())await pg.click('#drQuit');await pg.waitForSelector('.dr-tabs button');await pg.click('.dr-tabs button[data-tab="race"]');await pg.waitForSelector('#drGo');await pg.click('#drGo');await pg.waitForSelector('#drAns');
await pg.fill('#drAns','definitelywrong');await pg.press('#drAns','Enter');await pg.waitForTimeout(300);
ok((await pg.locator('#drMsg').innerText()).length>0,'doc race gives feedback on a wrong answer');
await pg.goto(BASE+'#home');

// version selector
await pg.goto(BASE+'#labs');await pg.waitForSelector('#verSel');
await pg.selectOption('#verSel','1.30');await pg.waitForTimeout(500);
ok(await pg.evaluate(()=>localStorage.getItem('kubedrill:target-version'))==='1.30','target version stored');
ok(await pg.locator('.ilab-card .vc, .ilab-card .ver-chip, .ilab-card [class*=newer]').count()>0||/newer than/i.test(await pg.locator('#ilabsList').innerText()),'labs newer than target are marked');
await pg.selectOption('#verSel','');

// full mock
await pg.goto(BASE+'#exam');await pg.waitForSelector('.ex-b');
await pg.click('.ex-b[data-b="cka-full"]');await pg.waitForSelector('#exFinish');
ok(await pg.locator('.ex-list > *').count()===16,'CKA full mock lists 16 tasks');
ok(/16 tasks/.test(await pg.locator('.ex-sub').innerText()),'header says 16 tasks');
const first=await pg.evaluate(()=>KL.exam&&KL.exam.state?1:1);
// open a task, do nothing, finish → review with per-task time
await pg.locator('.ex-list > *').first().click().catch(()=>{});await pg.waitForTimeout(800);
await pg.goto(BASE+'#exam');await pg.waitForTimeout(500);
pg.once('dialog',d=>d.accept());
if(await pg.locator('#exFinish').count()){await pg.click('#exFinish');}
await pg.waitForTimeout(700);
let r=await pg.locator('#page-exam').innerText();
ok(/pass mark/i.test(r)&&/practice set/i.test(r),'result uses "pass mark on this practice set" wording');
ok(/not.{0,40}(official|affiliated|endorsed)|independent/i.test(r),'result shows independence disclaimer');
ok(!/exam[- ]ready|guarantee/i.test(r)&&!/(?<!not mean )you will pass/i.test(r),'no banned claims on result');

// footer
ok(/independent|not affiliated/i.test(await pg.locator('.footer-legal').innerText()),'footer independence statement');

// mobile overflow
await pg.setViewportSize({width:375,height:760});
for(const h of ['#drills','#decode','#exam','#labs']){await pg.goto(BASE+h);await pg.waitForTimeout(600);
 const sw=await pg.evaluate(()=>[document.documentElement.scrollWidth,[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+2&&e.offsetParent).slice(0,4).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))]);ok(sw[0]<=377,'no horizontal overflow at 375px on '+h+(sw[0]>377?' '+JSON.stringify(sw):''));}
ok(errs.length===0,'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
await b.close();process.exit(bad?1:0)})();
