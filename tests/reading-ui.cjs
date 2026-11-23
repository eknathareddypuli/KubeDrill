const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log(c?'✔':'✘',m)};const T=ms=>pg.waitForTimeout(ms);
await pg.goto(BASE);await pg.evaluate(()=>{try{localStorage.removeItem('kubedrill:reading')}catch(e){}});
await pg.goto(BASE+'#reading');await pg.waitForSelector('.rd-card');
ok(await pg.locator('.rd-card').count()===15,'15 reading cases listed');
ok(!/s01-pending|Pending CPU|imagepull/i.test(await pg.locator('.rd-list').innerText()),'case list does not give the answer away');
// reading case 1
await pg.locator('.rd-card').first().click();await pg.waitForSelector('.rd-ev');
ok(/\$ kubectl get pods/.test(await pg.locator('.rd-ev').innerText()),'evidence shows the real commands and output');
await pg.locator('.rd-l:not(.cmd)',{hasText:'NAME'}).first().click();await T(200);
ok(/Not that one/.test(await pg.locator('#rdMsg').innerText()),'a wrong line gets a hint, not the answer');
ok(await pg.locator('.rd-l.hit').count()===0,'the clue is not revealed by a miss');
await pg.locator('.rd-l:not(.cmd)',{hasText:'FailedScheduling'}).first().click();await T(200);
ok(await pg.locator('.rd-l.hit').count()>=1,'clicking the clue marks it');
ok(await pg.locator('.rd-opt').count()===4,'step 2 offers four causes');
const right=await pg.evaluate(()=>KL.debrief['s01-pending-cpu'][0].replace(/`/g,''));
const labels=await pg.locator('.rd-opt').allInnerTexts();const wi=labels.findIndex(t=>t.trim()!==right.trim());
await pg.locator('.rd-opt').nth(wi).locator('input').check();await pg.click('#rdCheck');await T(200);
ok(/Not quite/.test(await pg.locator('#rdMsg2').innerText()),'a wrong cause is refused');
const ri=labels.findIndex(t=>t.trim()===right.trim());
await pg.locator('.rd-opt').nth(ri).locator('input').check();await pg.click('#rdCheck');await T(300);
ok(/What it was/.test(await pg.textContent('#readRoot'))&&/Reproduce it yourself/.test(await pg.textContent('#readRoot')),'right cause reveals the debrief and a link to the lab');
ok(await pg.locator('#readRoot a[href="#lab/s01-pending-cpu"]').count()===1,'link goes to the matching lab');
await pg.click('#rdList');await T(200);
ok(/1 of 15 done, 0 right first time/.test(await pg.locator('.pro-note').first().innerText()),'progress counted (not first try)');
// diff tab, simulator-reproduced
await pg.click('#readRoot .dr-tabs button[data-tab="diff"]');await T(200);
ok(await pg.locator('.rd-card').count()===12,'12 diffs listed');
await pg.locator('.rd-card').first().click();await pg.waitForSelector('.rd-panes');
ok(await pg.locator('.rd-pane.broken .rd-l').count()>5,'broken manifest is shown with numbered lines');
await pg.locator('.rd-pane.broken .rd-l',{hasText:'kind: Deployment'}).first().click();await T(150);
ok(/Not that line/.test(await pg.locator('#rdMsg').innerText()),'wrong line in B is refused');
await pg.locator('.rd-pane.broken .rd-l',{hasText:'app: web-app'}).first().click();await T(200);
ok(await pg.locator('.rd-pane.broken .rd-l.hit').count()===1,'the breaking line is marked');
const dright=await pg.evaluate(()=>KL.reading.DIFFS[0].why.right.replace(/`/g,''));
const dl=await pg.locator('.rd-opt').allInnerTexts();await pg.locator('.rd-opt').nth(dl.findIndex(t=>t.trim()===dright.trim())).locator('input').check();await pg.click('#rdCheck');await T(500);
ok(/does not match template/.test(await pg.locator('.rd-out').first().innerText()),'shows the real simulator error for B');
// API-rule diff shows the honesty note
await pg.click('#rdList');await T(150);await pg.locator('.rd-card',{hasText:'Rejected by the API server'}).click();await pg.waitForSelector('.rd-panes');
for(let i=0;i<3;i++){await pg.locator('.rd-pane.broken .rd-l',{hasText:'kind: Deployment'}).first().click();await T(120);}
const d9=await pg.evaluate(()=>KL.reading.DIFFS.find(d=>d.id==='d-requests').why.right.replace(/`/g,''));
const l9=await pg.locator('.rd-opt').allInnerTexts();await pg.locator('.rd-opt').nth(l9.findIndex(t=>t.trim()===d9.trim())).locator('input').check();await pg.click('#rdCheck');await T(300);
ok(/not reproduced in it/.test(await pg.textContent('#readRoot')),'API-rule-only diffs say they are not reproduced in the simulator');
// mobile
await pg.setViewportSize({width:375,height:760});await T(300);
ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=377),'no horizontal overflow at 375px (diff page)');
await pg.click('#rdList');await T(200);ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=377),'no horizontal overflow at 375px (list)');
ok(errs.length===0,'no console errors '+errs.join('|'));
await b.close();console.log(bad?'FAILED':'reading-ui OK');process.exit(bad?1:0)})();
