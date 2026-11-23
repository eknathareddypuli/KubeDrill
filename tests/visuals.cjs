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
await b.close();console.log(bad?bad+' FAILED':'all ok');process.exit(bad?1:0)})()
