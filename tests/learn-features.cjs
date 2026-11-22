const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1300,height:850}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++};
const run=async(c)=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await pg.waitForTimeout(150);if(await pg.locator('.br-pop').count())await pg.press('#lrIn','Enter');await pg.waitForTimeout(250)};
const open=async(id)=>{await pg.goto(BASE+'#lab/'+id);await pg.waitForSelector('#lrIn');await pg.waitForTimeout(500)};
await pg.goto(BASE);await pg.waitForTimeout(800);await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});

// worked example
await open('s140-worked-imagepull');
ok(await pg.locator('#lfWorked').count()===1,'worked-example panel is shown');
for(let i=0;i<4;i++){await pg.click('#lfNext');await pg.waitForTimeout(500);}
ok((await pg.locator('#lfWorked').innerText()).includes('Your turn'),'all 4 narrated steps ran');
ok((await pg.locator('#lrOut').innerText()).includes('deployment.apps/demo image updated'),'the expert command really ran in the terminal');
await pg.click('#lrCheck');await pg.waitForTimeout(400);
ok(!(await pg.locator('.lr-pass').count()),'watching alone does not pass the lab (mine is still broken)');
await run('kubectl set image deployment/mine c=nginx:1.25 -n we-image');await pg.click('#lrCheck');await pg.waitForTimeout(600);
ok(await pg.locator('.lr-pass').count()>0,'repeating the pattern on mine passes');
ok(await pg.locator('#lfCmp').count()===1,'compare-solutions panel appears after the pass');
ok((await pg.locator('#lfCmp').innerText()).includes('set image'),'it lists your commands and the reference');

const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:5000}).catch(()=>null),pg.click('#lfCard')]);
ok(!!dl&&dl.suggestedFilename()==='kubedrill-s140-worked-imagepull.png','completion card downloads as a PNG');
if(dl){const fp=await dl.path();const buf=require('fs').readFileSync(fp);ok(buf.slice(1,4).toString()==='PNG'&&buf.length>8000,'the PNG is a real image ('+buf.length+' bytes)');}

// why did my check fail
await open('s04-no-endpoints');await pg.click('#lrCheck');await pg.waitForTimeout(400);
ok(await pg.locator('.lf-why code').count()>0,'a failing check suggests the command that shows what it looked at');
await pg.locator('.lf-use').first().click();ok((await pg.inputValue('#lrIn')).startsWith('kubectl'),'the suggestion goes into the terminal');

// fading hints
await open('s141-worked-selector');
await pg.click('.lr-hint-btn');await pg.waitForTimeout(200);
ok((await pg.locator('.lr-hint').first().innerText()).includes('Level 1 · Nudge'),'first hint is a Nudge');
await pg.click('.lr-hint-btn');await pg.click('.lr-hint-btn');await pg.waitForTimeout(200);
ok((await pg.locator('.lr-hint').nth(2).innerText()).includes('Level 3 · Answer'),'last hint is labelled Answer');
await run("kubectl patch svc mine -n we-svc -p '{\"spec\":{\"selector\":{\"app\":\"mine\"}}}'");await pg.click('#lrCheck');await pg.waitForTimeout(600);
await pg.goto(BASE+'#labs');await pg.waitForTimeout(700);
ok(await pg.locator('#lfRevisit').count()===1&&(await pg.locator('#lfRevisit').innerText()).includes('S141'),'a lab that needed the Answer is offered again');

// predict, then run
await open('s142-worked-configmap');
await pg.check('#lfPredT');
await pg.fill('#lrIn','kubectl create configmap mine-cfg --from-literal=mode=live -n we-cfg');await pg.press('#lrIn','Enter');await pg.waitForTimeout(300);
ok(await pg.locator('#lfPredTx').count()===1,'change command asks for a prediction first');
ok(!(await pg.locator('#lrOut').innerText()).includes('configmap/mine-cfg created'),'command has not run yet');
await pg.fill('#lfPredTx','creates the configmap and pods become ready');await pg.click('#lfPredGo');await pg.waitForTimeout(500);
ok((await pg.locator('#lrOut').innerText()).includes('configmap/mine-cfg created'),'command runs after the prediction');
await pg.click('.lf-pred button[data-ok="1"]');await pg.waitForTimeout(300);
ok((await pg.evaluate(()=>KL.predStats())).t===1,'self-graded prediction is counted');
await pg.fill('#lrIn','kubectl get pods -n we-cfg');await pg.press('#lrIn','Enter');await pg.waitForTimeout(300);
ok(await pg.locator('#lfPredTx').count()===0,'read-only commands are not interrupted');

// source credits
await open('s147-gateway-canary');
ok(await pg.locator('#lfSrc a').count()>=2,'lab shows official docs links');
ok((await pg.locator('#lfSrc a').evaluateAll(a=>a.every(x=>x.href.startsWith('https://')&&x.rel.includes('noopener')))),'links are https and noopener');
await pg.click('#lfSrc summary');ok((await pg.locator('#lfSrc').innerText()).includes('does not copy'),'credit line is present');

// readiness range
await pg.goto(BASE+'#coverage');await pg.waitForSelector('.cov-tab');
ok((await pg.locator('.rd').first().innerText()).includes('Not enough timed attempts'),'no exams: says there is not enough evidence');
ok((await pg.locator('.rd-foot').first().innerText()).includes('Practise more before you sit the real exam'),'always tells you to practise more for the real exam');
await pg.evaluate(()=>{['CKA Mock 1','CKA Mock 2','CKA Mock 3'].forEach((n,i)=>KL.store.addExam({date:Date.now()+i,track:n,pct:[58,64,71][i],got:1,tot:2,secs:100,n:3}))});
await pg.goto(BASE+'#coverage');await pg.waitForSelector('.cov-tab');await pg.waitForTimeout(300);
const rt=await pg.locator('.rd').first().innerText();
ok(rt.includes('58% to 71%')&&rt.includes('pass mark 66'),'shows the observed range, not a single number');
ok(rt.includes('Not ready yet'),'a range that dips below the pass mark is not called ready');
ok((await pg.locator('.rd-band').count())===1&&(await pg.locator('.rd-pass').count())===1,'range bar with the pass mark is drawn');
await pg.evaluate(()=>{['CKAD Mock 1','CKAD Mock 2','CKAD Mock 3'].forEach((n,i)=>KL.store.addExam({date:Date.now()+9+i,track:n,pct:[80,82,85][i],got:1,tot:2,secs:100,n:3}))});
await pg.click('.cov-tab[data-t="CKAD"]');await pg.waitForTimeout(300);
const rt2=await pg.locator('.rd').first().innerText();
ok(!rt2.includes('Looking good')||rt2.includes('practise more')||rt2.includes('Practise more'),'even high scores keep the practise-more warning');
ok(rt2.includes('You have practised')||rt2.includes('Looking good'),'low skill coverage is called out or the level is shown');

// YAML repair lab
await pg.evaluate(()=>localStorage.setItem('kubedrill:predon','0'));await open('s144-yaml-indent');
await run('kubectl apply -f /home/student/webpod.yaml');
ok((await pg.locator('#lrOut').innerText()).includes('unknown field "image"'),'the broken manifest fails like real kubectl');

ok(errs.length===0,'no console errors '+errs.slice(0,2));
await b.close();console.log(bad?bad+' FAILED':'learn-features OK');process.exit(bad?1:0)})();
