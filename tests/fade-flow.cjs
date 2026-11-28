// Fading level moves up after a clean pass, stays after help, hidden in exam mode; command diff on a restore lab.
const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log(c?'✔':'✘',m)};const T=ms=>pg.waitForTimeout(ms);
const run=async c=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await T(200);if(await pg.locator('.br-pop').count())await pg.keyboard.press('Enter');await T(350);if(await pg.locator('#lfPredSkip').count()){await pg.click('#lfPredSkip');await T(200)}};
async function solve(id){await pg.goto('about:blank');await pg.goto(BASE+'#lab/'+id);await pg.waitForSelector('#lrIn');await T(1500);if(await pg.locator('#lrPredSkip').count())await pg.click('#lrPredSkip');const sol=await pg.evaluate(i=>KL.Labs.byId[i].solution,id);for(const c of sol)await run(c);await T(1800);await pg.click('#lrCheck');await T(2000);}
const id='s236-selective-restore';
await pg.goto(BASE+'#lab/'+id);await T(300);await pg.evaluate(i=>KL.fadeLevel.set(KL.Labs.byId[i],2),id);
await solve(id);
ok(await pg.evaluate(i=>KL.fadeLevel.level(KL.Labs.byId[i]),id)===3,'clean pass at level 2 moves the lab to level 3');
ok(/Next time: level 3/.test(await pg.locator('#lfFadeNote').innerText()),'the pass note says what happens next');
ok(await pg.locator('#lrDiff .cd-row').count()>=1,'command diff after the restore');
const dtxt=await pg.locator('#lrDiff').innerText();ok(/Deployment\/api/.test(dtxt)&&!/ConfigMap\/settings/.test(dtxt),'diff shows the restored Deployment and not the untouched ConfigMap');
// help keeps the level
await pg.evaluate(i=>KL.fadeLevel.set(KL.Labs.byId[i],2),id);
await pg.goto(BASE+'#lab/'+id);await pg.waitForSelector('#lrIn');await T(1500);
await pg.click('.fd-r >> nth=0');
const sol=await pg.evaluate(i=>KL.Labs.byId[i].solution,id);for(const c of sol)await run(c);await T(1500);await pg.click('#lrCheck');await T(2000);
ok(await pg.evaluate(i=>KL.fadeLevel.level(KL.Labs.byId[i]),id)===2,'passing after a reveal keeps the level');
// watched pass
await pg.evaluate(i=>KL.fadeLevel.set(KL.Labs.byId[i],1),id);await pg.goto('about:blank');await pg.goto(BASE+'#lab/'+id);await pg.waitForSelector('#lrIn');await T(1500);
const n=await pg.evaluate(i=>KL.Labs.byId[i].solution.length,id);for(let i=0;i<n;i++){await pg.click('#fdNext');await T(450)}
await pg.click('#lrCheck');await T(2000);
ok(await pg.evaluate(i=>KL.fadeLevel.level(KL.Labs.byId[i]),id)===2,'a watched pass moves to level 2');
console.log(JSON.stringify(await pg.evaluate(()=>KL.labReview.data()['s236-selective-restore'])));ok(await pg.evaluate(()=>{const d=KL.labReview.data()['s236-selective-restore'];return d&&d.clean===false}),'and is not counted as a clean pass in the review schedule');
// exam mode hides it
await pg.goto(BASE+'#lab/'+id);await pg.waitForSelector('#lrIn');await T(800);await pg.click('#lrMode_exam');await T(1200);
ok(await pg.locator('#lfFade').count()===0,'no fading panel in exam mode');
ok(errs.length===0,'no page errors '+errs.join('|'));
await b.close();console.log(bad?bad+' FAILED':'all ok');process.exit(bad?1:0)})();
