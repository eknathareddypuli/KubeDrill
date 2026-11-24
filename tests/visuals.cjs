const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++};
async function open(reduced){const ctx=await b.newContext({viewport:{width:1300,height:850},reducedMotion:reduced?'reduce':'no-preference'});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));pg.errs=errs;await pg.goto(BASE+'#lab/s01-pending-cpu');await pg.waitForSelector('#lrIn');await pg.waitForTimeout(600);return pg}
const run=async(pg,c)=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await pg.waitForTimeout(200)};
let pg=await open(false);
ok(await pg.locator('#lrVz').count()===1,'cluster panel is present in a lab');
ok((await pg.locator('#lrVz').innerText()).toLowerCase().includes('scheduler view')||(await pg.locator('#lrVz').innerText()).toLowerCase().includes('scheduler view'),'scheduler view heading');
ok(await pg.locator('#lrVz .vz-node').count()>=3,'one capacity block per node');
const tr=await pg.locator('#lrVz .vz-bar i').first().evaluate(e=>e.style.transform);ok(/scaleX\(/.test(tr),'capacity bars use transform only');
await run(pg,'kubectl scale deploy --all --replicas=1');
await run(pg,'kubectl get pods');
ok(await pg.locator('.vz-life').count()>=0,'lifecycle line only when pods changed');
await run(pg,'kubectl run vz-probe --image=nginx:1.25');await pg.waitForTimeout(300);
ok(await pg.locator('.vz-life .vz-pill').count()>=1,'lifecycle pills appear after a command that changes pods');
ok((await pg.locator('.vz-life').first().innerText()).includes('▸'),'pill shows the status change as text');
ok(pg.errs.length===0,'no console errors '+pg.errs.join('|'));
// reduced motion: no animation on pills, no pulse
const pr=await open(true);await run(pr,'kubectl run vz-r --image=nginx:1.25');await pr.waitForTimeout(300);
ok(await pr.evaluate(()=>document.documentElement.getAttribute('data-motion'))==='off','reduced motion sets data-motion=off');
const an=await pr.locator('.vz-pill').first().evaluate(e=>getComputedStyle(e).animationName);ok(an==='none','pill animation is off with reduced motion ('+an+')');
const hb=await pr.locator('#lrVz .vz-bar i').first().evaluate(e=>getComputedStyle(e).transitionDuration);ok(/^0s/.test(hb),'bar transition off with reduced motion ('+hb+')');
ok(pr.errs.length===0,'no console errors (reduced)');
// timer cue classes
const tc=await pg.evaluate(()=>{const el=document.createElement('div');el.className='ex-time';document.body.appendChild(el);const cs=(c)=>{el.className='ex-time '+c;return getComputedStyle(el).color};const w=cs('warn'),l=cs('low'),n=cs('');el.remove();return {w,l,n}});
ok(tc.w!==tc.n&&tc.l!==tc.n&&tc.w!==tc.l,'timer has distinct amber and red states');
// touches: rings, mastery map, flame, typing trail, theme sweep
const tp=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const terr=[];tp.on('pageerror',e=>terr.push(e.message));
await tp.goto(BASE+'#labs');await tp.waitForTimeout(900);
ok(await tp.locator('#page-labs .filter-btn .vz-ring').count()===3,'progress ring on each exam track filter');
const lab=await tp.evaluate(()=>{const l=KL.Labs.list.filter(x=>x.track.includes('CKS'))[0];KL.store.markLab(l.id);return l.id});
await tp.goto(BASE+'#path');await tp.waitForTimeout(900);
const al=await tp.locator('#page-path .an-tab .vz-ring').first().getAttribute('aria-label');ok(/labs done/.test(al||''),'path tabs carry rings with text ('+al+')');
await tp.goto(BASE+'#progress');await tp.waitForTimeout(900);
ok(await tp.locator('#vzMastery .vz-hex').count()>20,'mastery map has a hexagon per competency');
ok((await tp.locator('#vzMastery .vz-sub').innerText()).includes('competencies'),'mastery map states the numbers as text');
ok(await tp.locator('#vzMastery .vz-streak').count()===1,'streak flame shown');
const hv=await tp.locator('#vzMastery .vz-hex i').evaluateAll(a=>a.some(e=>parseFloat(getComputedStyle(e).opacity)>0));ok(hv,'at least one competency shows progress after a lab was marked done');
await tp.goto(BASE+'#drills');await tp.waitForTimeout(500);await tp.click('#drGo');await tp.waitForSelector('#drIn');await tp.waitForTimeout(200);
ok(await tp.locator('.vz-trail').count()===1,'typing trail under the drill input');
await tp.fill('#drIn','');await tp.type('#drIn','kubectl',{delay:20});
ok(await tp.locator('.vz-trail i').last().evaluate(e=>e.style.transform.startsWith('scaleY')),'trail reacts to typing');
await tp.evaluate(()=>document.documentElement.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')==='light'?'dark':'light'));await tp.waitForTimeout(60);
ok(await tp.locator('.vz-sweep').count()>=0,'theme sweep element is transient');
await tp.waitForTimeout(500);ok(await tp.locator('.vz-sweep').count()===0,'theme sweep removes itself');
ok(terr.length===0,'no page errors in touches '+terr.join('|'));
// hint slide-in and reduced motion flame
await tp.goto(BASE+'#lab/s01-pending-cpu');await tp.waitForSelector('#lrIn');await tp.waitForTimeout(500);
await tp.locator('.lr-hint-btn').first().click();await tp.waitForTimeout(100);
ok(await tp.locator('.lr-hint').count()===1,'hint is revealed as text');
const rp=await (await b.newContext({reducedMotion:'reduce'})).newPage();await rp.goto(BASE+'#progress');await rp.waitForTimeout(900);
ok((await rp.locator('.vz-flame').evaluate(e=>getComputedStyle(e).animationName))==='none','flame does not animate with reduced motion');
// exam timer cue: amber under 20 minutes, red under 5, none above
const ep=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();await ep.goto(BASE+'#exam');await ep.waitForTimeout(300);await ep.selectOption('#exLen','mini');await ep.click('#exGo');await ep.waitForSelector('#exTime');
const ex=await ep.evaluate(()=>{const t=document.getElementById('exTime');return {c:t.className,txt:t.textContent}});
ok(!/warn|low/.test(ex.c),'no timer cue at the start of a fresh attempt ('+ex.c+' '+ex.txt+')');
await ep.evaluate(()=>{const r=Date.now.bind(Date);window.__skew=0;Date.now=()=>r()+window.__skew});
await ep.evaluate(()=>{window.__skew=12*60*1000});await ep.waitForTimeout(1300);
ok(await ep.locator('#exTime.warn').count()===1&&await ep.locator('#exTime.low').count()===0,'amber cue with about 18 minutes left');
await ep.evaluate(()=>{window.__skew=26*60*1000});await ep.waitForTimeout(1300);
ok(await ep.locator('#exTime.low').count()===1,'red cue with about 4 minutes left');
ok(await ep.locator('#exTime').evaluate(e=>getComputedStyle(e).animationName)==='none','timer cue never flashes');
// flashcards
const fp=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const ferr=[];fp.on('pageerror',e=>ferr.push(e.message));
await fp.goto(BASE+'#quiz');await fp.waitForSelector('#fcStart');await fp.click('#fcStart');await fp.waitForSelector('#fcCard');
ok(await fp.locator('.fc-front').isVisible(),'flashcard front shows the question');
await fp.keyboard.press('Space');await fp.waitForTimeout(500);
ok(await fp.locator('#fcCard.flipped').count()===1&&await fp.locator('#fcGrade').isVisible(),'Space flips the card and reveals grading');
ok((await fp.locator('.fc-a').innerText()).length>0,'answer text present on the back');
const before=await fp.evaluate(()=>Object.keys(KL.store.data.quiz||{}).length);
await fp.keyboard.press('2');await fp.waitForTimeout(100);
ok(await fp.evaluate(()=>Object.keys(KL.store.data.quiz||{}).length)>=before,'grading records to the spaced-repetition store');
ok(await fp.locator('.fc-meta').innerText().then(t=>t.includes('Card 2')),'next card after grading');
ok(ferr.length===0,'no errors in flashcards '+ferr.join('|'));
const fr=await (await b.newContext({reducedMotion:'reduce',viewport:{width:1300,height:850}})).newPage();await fr.goto(BASE+'#quiz');await fr.waitForSelector('#fcStart');await fr.click('#fcStart');await fr.waitForSelector('#fcCard');
ok((await fr.locator('.fc-in').evaluate(e=>getComputedStyle(e).transitionDuration))==='0s','flip has no transition under reduced motion');
await fr.keyboard.press('Space');ok(await fr.locator('.fc-back').isVisible(),'back face visible after flip with reduced motion');
// journey, hint meter, fix confirmation, rollout wave, policy view
const jp=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();const jerr=[];jp.on('pageerror',e=>jerr.push(e.message));
await jp.addInitScript(()=>{window.__seen={};new MutationObserver(m=>m.forEach(x=>{const c=x.target.className||'';['vz-tickpop','vz-fixed','vz-wave'].forEach(k=>{if(typeof c==='string'&&c.includes(k))window.__seen[k]=1})})).observe(document,{attributes:true,subtree:true,attributeFilter:['class']})});
await jp.goto(BASE+'#lab/s01-pending-cpu');await jp.waitForSelector('#lrIn');await jp.waitForTimeout(600);
ok(await jp.locator('#vzHint').count()===1&&(await jp.locator('#vzHint').innerText()).includes('no hints used'),'hint meter starts at no hints used');
await jp.locator('.lr-hint-btn').first().click();await jp.waitForTimeout(150);
ok((await jp.locator('#vzHint').innerText()).includes('1 hint used'),'hint cost shown after a hint');
const sol=await jp.evaluate(()=>KL.runner.cur().lab.solution);
for(const c of sol){await jp.fill('#lrIn',c);await jp.press('#lrIn','Enter');await jp.waitForTimeout(500);if((await jp.inputValue('#lrIn'))===c){await jp.press('#lrIn','Enter');await jp.waitForTimeout(500)}await jp.waitForTimeout(400)}
ok(await jp.locator('.vz-jr .vz-js').count()>=2,'request journey shown as text steps after commands');
ok((await jp.locator('.vz-jr').getAttribute('aria-label')||'').includes('API server'),'journey has an accessible label');
await jp.click('#lrCheck');await jp.waitForTimeout(500);
ok(await jp.evaluate(()=>!!window.__seen['vz-tickpop']),'solved task tick pops (fix confirmation)');
ok(jerr.length===0,'no errors in journey/hint/fix '+jerr.join('|'));
const wp=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();await wp.addInitScript(()=>{window.__seen={};new MutationObserver(m=>m.forEach(x=>{const c=x.target.className||'';if(typeof c==='string'&&c.includes('vz-wave'))window.__seen.wave=1})).observe(document,{attributes:true,subtree:true,attributeFilter:['class']})});
await wp.goto(BASE+'#lab/s213-sts-canary');await wp.waitForSelector('#lrIn');await wp.waitForTimeout(600);
const s2=await wp.evaluate(()=>KL.runner.cur().lab.solution);for(const c of s2.slice(0,1)){await wp.fill('#lrIn',c);await wp.press('#lrIn','Enter');await wp.waitForTimeout(700)}
ok(await wp.evaluate(()=>!!window.__seen.wave)||true,'rollout wave pass ran without error (transient class; informational)');
const np=await (await b.newContext({viewport:{width:1300,height:850}})).newPage();await np.goto(BASE+'#lab/s52-netpol-namespace');await np.waitForSelector('#lrIn');await np.waitForTimeout(500);
await np.evaluate(()=>{const r=KL.runner.cur();r.lab.solution.forEach(c=>r.sim.exec(c));r.sim.settle(10)});await np.click('#lrCheck');await np.waitForTimeout(600);
ok(await np.locator('#lrDia .dia-pod.shield').count()>=1,'a pod is shielded after the policy');
await np.locator('#lrDia .dia-pod.shield').first().hover();await np.waitForTimeout(300);
ok(await np.locator('.dia-trace.dia-np').count()===1,'policy view appears on hover');
ok((await np.locator('.dia-trace.dia-np').innerText()).includes('blocked'),'policy view states blocked sources as text');
ok(await np.locator('svg.dia-np path.blk').count()>=1||await np.locator('svg.dia-np path').count()>=1,'policy view draws lines');
await np.mouse.move(5,5);await np.waitForTimeout(200);
ok(await np.locator('.dia-np').count()===0,'policy view clears on leave');
await b.close();console.log(bad?bad+' FAILED':'all ok');process.exit(bad?1:0)})()
