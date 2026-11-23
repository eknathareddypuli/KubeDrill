const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1300,height:850}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++};
const run=async(c)=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await pg.waitForTimeout(150);if(await pg.locator('.br-pop').count())await pg.press('#lrIn','Enter');await pg.waitForTimeout(250)};
const open=async(id)=>{await pg.goto(BASE+'#lab/'+id);await pg.waitForSelector('#lrIn');await pg.waitForTimeout(500)};
const check=async()=>{await pg.click('#lrCheck');await pg.waitForTimeout(400)};
await pg.goto(BASE);await pg.waitForTimeout(800);await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});

// ── coverage ──
await pg.goto(BASE+'#coverage');await pg.waitForSelector('.cov-tab');
ok(await pg.locator('.cov-tab').count()===3,'coverage page has CKA/CKAD/CKS tabs');
ok((await pg.locator('.cov-big').innerText()).startsWith('0'),'nothing practised on a fresh profile');
ok(await pg.locator('.cov-nosim').count()>0,'skills a simulator cannot teach are labelled, not hidden');
await pg.evaluate(()=>{KL.store.markLab('s63-etcd-backup',true)});await pg.waitForTimeout(200);
ok((await pg.locator('.cov-big').innerText()).startsWith('1'),'finishing a lab covers its skill (etcd)');
await pg.click('.cov-tab[data-t="CKS"]');ok(await pg.locator('.cov-open .cov-go').count()>0,'open skills link to the next lab to practise');
await pg.goto(BASE+'#progress');await pg.waitForSelector('.cov-mini');ok(await pg.locator('.cov-mini .cov-row').count()===3,'progress page shows the coverage meter');

// ── constraint, hint tracking, checker reasons ──
await open('s04-no-endpoints');
ok(await pg.locator('#lrCons').count()===1,'constraint box is shown');
ok(await pg.locator('.lr-hint-btn').first().innerText().then(t=>/marks task assisted/.test(t)),'hint button states its cost up front');
await pg.locator('.lr-hint-btn').first().click();await pg.waitForTimeout(200);
ok(await pg.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('kubedrill:weak')||'{}')).length)===1,'using a hint records the weak spot');
await check();ok((await pg.locator('#lrFeedback').innerText()).includes('selector app=front-end matches 0 pods'),'failing check explains WHY (selector vs pod labels)');
// constraint violation: relabel pods instead of fixing the service
await run('kubectl patch svc frontend-svc -p \'{"spec":{"selector":{"app":"frontend"}}}\'');
// ── stage 2 ──
await check();ok(await pg.locator('.lr-stage2').count()===1,'stage 1 passing reveals a hidden second fault');
ok(await pg.locator('.lr-task.stage2').count()===1,'a stage-2 task appears');
ok(!(await pg.evaluate(()=>!!document.querySelector('.lr-pass'))),'lab is not complete while stage 2 is open');
// persistence: reload the page mid-stage-2
await pg.waitForTimeout(500);await pg.reload();await pg.waitForSelector('#lrIn');await pg.waitForTimeout(700);
ok(await pg.locator('.lr-task.stage2').count()===1,'stage 2 survives a reload');
await run('kubectl patch svc checkout-svc -n store -p \'{"spec":{"ports":[{"port":80,"targetPort":80}]}}\'');
await check();
ok(await pg.locator('.lr-pass').count()===1,'all tasks incl. stage 2 pass -> lab complete');
ok((await pg.locator('#lrFeedback').innerText()).includes('Assisted'),'result shows assisted (hint used), not clean');
ok(await pg.locator('.lr-trap').count()===1&&await pg.locator('.lr-why').count()===1,'trap and "why this works" appear in the debrief');
await pg.click('.lr-why summary');await pg.click('#lrProve');await pg.waitForTimeout(300);
ok((await pg.locator('#lrOut').innerText()).includes('frontend-svc'),'proof command runs in the terminal');
ok(await pg.locator('.lr-rung a.btn-primary').count()===1,'next rung of the ladder is offered');
const nextHref=await pg.locator('.lr-rung a.btn-primary').getAttribute('href');ok(nextHref==='#lab/s29-svc-targetport','next rung is the next harder Services lab');
await pg.click('#lrVar2');await pg.waitForTimeout(800);ok(/#lab\/s04-no-endpoints~v\d+/.test(await pg.evaluate(()=>location.hash)),'new variant opens a seeded variant URL');
ok((await pg.locator('.lr-var').innerText()).includes('Variant'),'variant is labelled');
ok(await pg.evaluate(()=>KL.store.labDone('s04-no-endpoints')),'finishing the lab marked the base lab done');

// ── variant deep link, solved with a clean solve ──
await open('s01-pending-cpu~v2');
ok((await pg.locator('.lr-story').innerText()).includes('billing'),'variant v2 uses different names');
await run('kubectl set resources deployment/api --requests=cpu=100m,memory=64Mi');await pg.waitForTimeout(500);await run('kubectl rollout status deployment/api');
await check();ok(await pg.locator('.lr-stage2').count()===1,'variant also has its hidden second fault');
await run('kubectl set image deployment/cache cache=nginx:1.25');await run('kubectl rollout status deployment/cache');await check();
ok(await pg.locator('.lr-pass').count()===1,'variant completes');
ok((await pg.locator('.lr-clean.yes').first().innerText()).includes('Clean solve'),'no hints and no solution = clean solve');

// ── speed round ──
await pg.click('#lrSpeed');await pg.waitForSelector('.lr-speed',{timeout:5000});
ok((await pg.locator('.lr-speed').innerText()).includes('Speed round'),'speed round resets the lab with a target');
ok(await pg.locator('.lr-hint-btn').count()===0,'no hints in the speed round');

// ── dead-end nudge ──
await open('s34-nodeselector');
for(let i=0;i<15;i++){await pg.fill('#lrIn','kubectl get pods -n sched');await pg.press('#lrIn','Enter');await pg.waitForTimeout(60);}
await pg.waitForTimeout(300);ok(await pg.locator('#lrNudge').count()===1,'15 read-only commands trigger the dead-end nudge');
ok((await pg.locator('#lrNudge').innerText()).includes('describe pod'),'nudge names the failing pod to describe');
await run('kubectl label node worker2 gpu=true');ok(await pg.locator('#lrNudge').count()===0,'a changing command clears the nudge');

// ── constraint enforcement: removing the nodeSelector must not pass ──
await open('s34-nodeselector');
await run('kubectl patch deployment ml -n sched --type=json -p \'[{"op":"remove","path":"/spec/template/spec/nodeSelector"}]\'');await pg.waitForTimeout(500);
await check();ok((await pg.locator('#lrFeedback').innerText()).includes('Constraint broken')||!(await pg.locator('.lr-pass').count()),'dropping the nodeSelector breaks the constraint');

// ── daily challenge uses a seeded variant ──
ok(await pg.evaluate(()=>{const id=KL.daily.today().id;return KL.Labs.variantFor(id,'2026-11-18')===KL.Labs.variantFor(id,'2026-11-18')}),'variant pick is deterministic per seed');
ok(errs.length===0,'no console errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
console.log(bad?`\n${bad} FAILED`:'\nall lab-design checks OK');await b.close();process.exit(bad?1:0)})();
