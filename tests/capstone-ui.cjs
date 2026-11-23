const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));pg.on('dialog',d=>d.accept());
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log(c?'✔':'✘',m)};const T=ms=>pg.waitForTimeout(ms);
const run=async c=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await T(150);if(await pg.locator('.br-pop').count())await pg.keyboard.press('Enter');await T(300)};
await pg.goto(BASE);await pg.evaluate(()=>{localStorage.setItem('kl.predict','off')});
// capstone partial score
await pg.goto(BASE+'#lab/s170-capstone-cka');await pg.waitForSelector('#lrIn');await T(800);
await run('kubectl create pdb web-pdb --selector=app=web --min-available=2 -n cap-cka');
await run("kubectl patch cronjob backup -n cap-cka -p '{\"spec\":{\"suspend\":false,\"concurrencyPolicy\":\"Forbid\"}}'");await T(1500);
await pg.click('#lrCheck');await T(800);
const txt=await pg.textContent('body');ok(/22\s*(\/|of)\s*100|22 points|22\/100/.test(txt),'capstone partial score 22/100 shown');
ok(await pg.locator('.lr-score').count()>0,'score line rendered');
ok(await pg.locator('.lr-debrief').count()===0,'no completion on partial score');
// red herring card after solving
await pg.goto(BASE+'#lab/s38-memory-too-high');await pg.waitForSelector('#lrIn');await T(800);
const sol=await pg.evaluate(()=>KL.Labs.byId['s38-memory-too-high'].solution);
for(const c of sol) await run(c); await T(3500);await pg.click('#lrCheck');await pg.waitForSelector('.lr-debrief',{timeout:8000}).catch(()=>{});
ok(/Red herring/i.test(await pg.textContent('body')),'red herring card shown on completion');
ok(errs.length===0,'no console errors '+errs.join('|'));
await b.close();console.log(bad?'FAILED':'capstone-ui OK');process.exit(bad?1:0)})();
