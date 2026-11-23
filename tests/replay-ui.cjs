const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log(c?'✔':'✘',m)};const T=ms=>pg.waitForTimeout(ms);
const run=async c=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await T(150);if(await pg.locator('.br-pop').count())await pg.keyboard.press('Enter');await T(300)};
await pg.goto(BASE);await pg.evaluate(()=>{localStorage.setItem('kl.predict','off')});
await pg.goto(BASE+'#lab/s38-memory-too-high');await pg.waitForSelector('#lrIn');await T(800);
// a deliberately messy attempt: act first, fail, repeat, then solve
await run('kubectl delete pod --all -n mem');
await run('kubectl get pods -n mem');await run('kubectl get pods -n mem');
await run('kubectl set resources deployment/nope -n mem --requests=memory=1Mi');
const sol=await pg.evaluate(()=>KL.Labs.byId['s38-memory-too-high'].solution);
for(const c of sol) await run(c); await T(3500);await pg.click('#lrCheck');await pg.waitForSelector('.lr-debrief',{timeout:8000}).catch(()=>{});
await pg.waitForSelector('.rp-box',{timeout:5000}).catch(()=>{});
ok(await pg.locator('.rp-box').count()===1,'replay card appears once on completion');
const t=await pg.locator('.rp-box').innerText();
ok(/Your commands/.test(t)&&/Reference path/.test(t),'two columns: your commands and the reference path');
ok(await pg.locator('.rp-you li.rp-fail').count()>=1,'the failed command is marked');
ok(await pg.locator('.rp-you li.rp-repeat').count()>=1,'the repeated command is marked');
ok(/before you had looked/i.test(t),'note: acted before looking');
ok(/kubectl delete pod --all/.test(t),'your first command is listed');
// no horizontal overflow on a phone
await pg.setViewportSize({width:375,height:760});await T(300);
ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=377),'no overflow at 375px');
ok(errs.length===0,'no console errors '+errs.join('|'));
await b.close();console.log(bad?'FAILED':'replay-ui OK');process.exit(bad?1:0)})();
