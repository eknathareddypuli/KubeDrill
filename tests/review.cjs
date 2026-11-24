// Lab spaced review + speed card: pass a lab, check the card, the schedule, and the Trainers "Lab review" tab (incl. a due item).
const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log(c?'✔':'✘',m)};const T=ms=>pg.waitForTimeout(ms);
await pg.goto(BASE+'#lab/s233-noisy-namespace');await pg.waitForSelector('#lrIn');await T(1500);
const run=async c=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await T(200);if(await pg.locator('.br-pop').count())await pg.keyboard.press('Enter');await T(300);if(await pg.locator('#lfPredSkip').count()){await pg.click('#lfPredSkip');await T(200)}};
// skip the prediction card if present
if(await pg.locator('#lrPredSkip').count())await pg.click('#lrPredSkip');
const sol=await pg.evaluate(()=>KL.Labs.byId['s233-noisy-namespace'].solution);
for(const c of sol)await run(c);await T(1500);await pg.click('#lrCheck');await T(1500);
ok(await pg.locator('#lrBench').count()===1,'speed card appears after a pass');
const txt=await pg.locator('#lrBench').innerText();ok(/commands/.test(txt)&&/reference path/.test(txt)&&/Next review/.test(txt),'card shows time, commands, reference path, next review');
const d=await pg.evaluate(()=>KL.labReview.data());const o=d['s233-noisy-namespace'];ok(o&&o.n===1&&o.stage===1&&o.due>Date.now(),'review scheduled (stage 1, due in the future)');
ok(o&&Math.round((o.due-o.last)/86400000)===(o.clean?3:3),'first review is 3 days out');
// make it due and look at the Trainers tab
await pg.evaluate(()=>{const d=KL.labReview.data();d['s233-noisy-namespace'].due=Date.now()-1000;localStorage.setItem('kubedrill:labrev',JSON.stringify(d));});
await pg.goto(BASE+'#trainers');await T(600);
await pg.locator('.tr-tabs .an-tab[data-t=review]').click();await T(300);
ok(await pg.locator('.lb-item').count()>=1,'due lab listed in Lab review');
const href=await pg.locator('.lb-item a').first().getAttribute('href');ok(/^#lab\/s233/.test(href||''),'review link opens the lab or a variant: '+href);
ok(await pg.locator('text=Same symptom, different cause').count()>0,'symptom sets card present');
ok(await pg.locator('.tr-card a[href^="#lab/s229"]').count()>0,'S229 listed in symptom sets');
ok(/Lab review \(1\)/.test(await pg.locator('.tr-tabs').innerText()),'tab shows the due count');
ok(errs.length===0,'no page errors '+errs.join('|'));
await b.close();console.log(bad?bad+' FAILED':'all ok');process.exit(bad?1:0)})();
