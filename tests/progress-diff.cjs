// Command diff after a pass, full progress backup/restore, exam rehearsal card.
const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log(c?'✔':'✘',m)};const T=ms=>pg.waitForTimeout(ms);
const id='s233-noisy-namespace';
await pg.goto(BASE+'#lab/'+id);await pg.waitForSelector('#lrIn');await T(1500);
const run=async c=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await T(200);if(await pg.locator('.br-pop').count())await pg.keyboard.press('Enter');await T(300);if(await pg.locator('#lfPredSkip').count()){await pg.click('#lfPredSkip');await T(200)}};
if(await pg.locator('#lrPredSkip').count())await pg.click('#lrPredSkip');
const sol=await pg.evaluate(i=>KL.Labs.byId[i].solution,id);for(const c of sol)await run(c);await T(1500);await pg.click('#lrCheck');await T(1800);
ok(await pg.locator('#lrDiff').count()===1,'command diff card appears after a pass');
const n=await pg.locator('#lrDiff .cd-row').count();ok(n>=1,'diff lists changed objects: '+n);
const txt=await pg.locator('#lrDiff').innerText();ok(/changed|created|deleted/.test(txt),'rows say what happened');
if(n>=1){await pg.locator('#cdRange').fill('0');await T(200);ok(await pg.locator('#lrDiff .cd-on').count()===0,'slider at 0 shows the starting cluster');
await pg.locator('#cdRange').fill(String(n));await T(200);ok(await pg.locator('#lrDiff .cd-on').count()===n,'slider at end shows every change');}
// unit: an untouched lab has no diff
const none=await pg.evaluate(i=>{const l=KL.Labs.byId[i];const r=KL.cmdDiff.diff(KL.cmdDiff.before(l),KL.cmdDiff.before(l));return r.changes.length},id);ok(none===0,'same cluster yields no changes');
// backup / restore
await pg.evaluate(()=>{localStorage.setItem('kubedrill:fade','{"x":2}');});
const bk=await pg.evaluate(()=>KL.progressIO.exportAll());const j=JSON.parse(bk);ok(j.format===2&&j.extra['kubedrill:labrev']&&j.extra['kubedrill:fade'],'backup includes review schedule and extra keys');
await pg.evaluate(()=>{localStorage.removeItem('kubedrill:labrev');localStorage.removeItem('kubedrill:fade')});
await pg.evaluate(t=>KL.progressIO.apply(KL.progressIO.parse(t)),bk);
ok(await pg.evaluate(()=>!!localStorage.getItem('kubedrill:labrev')&&localStorage.getItem('kubedrill:fade')==='{"x":2}'),'restore brings back review and extra keys');
ok(await pg.evaluate(()=>KL.progressIO.parse(JSON.stringify({v:1,labs:{}})).kind==='legacy'),'old backups still import');
let thrown=false;try{await pg.evaluate(()=>KL.progressIO.parse('{"hello":1}'))}catch(e){thrown=true}ok(thrown,'non-backup file is rejected');
await pg.goto(BASE+'#settings');await T(600);ok(await pg.locator('#setBackup').count()===1&&await pg.locator('#setRestore').count()===1,'settings has backup and restore');
// rehearsal
await pg.goto(BASE+'#exam');await T(800);
ok(await pg.locator('#rhCard').count()===1,'rehearsal card on exam page');
ok(/not the real exam/i.test(await pg.locator('#rhCard').innerText()),'honest label present');
ok(errs.length===0,'no page errors '+errs.join('|'));
await b.close();console.log(bad?bad+' FAILED':'all ok');process.exit(bad?1:0)})();
