// New content: walkthroughs, quiz, explainers, flows, story, level mocks, lab ids referenced by flows/stories exist.
const {chromium}=require('playwright-core');let bad=0;const ok=(c,m)=>{console.log((c?'✔ ':'✘ ')+m);if(!c)bad++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1300,height:850}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/index.html#quiz');await p.waitForTimeout(1200);await p.evaluate(()=>window.startQuiz());
const d=await p.evaluate(()=>{const ids=new Set(KL.Labs.list.map(l=>l.id));const miss=[];KL.flows.forEach(f=>Object.values(f.nodes).forEach(n=>{if(n.lab&&!ids.has(n.lab))miss.push(n.lab)}));KL.stories.forEach(s=>s.chapters.forEach(c=>{if(!ids.has(c.lab))miss.push(c.lab)}));
 const lv=KL.exam.bundles().filter(x=>x.level);const lvOk=lv.every(x=>x.ids.every(id=>KL.Labs.byId[id]&&KL.Labs.byId[id].diff===x.level));
 const q=KL.quizAll;const dup=q.length-new Set(q.map(x=>x.id)).size;
 return {q:q.length,types:[...new Set(q.map(x=>x.type))],dup,walk:LABS.length,con:KL.concepts.length,flows:KL.flows.length,miss,lv:lv.length,lvOk,labs:KL.Labs.list.length}});
ok(d.q>=358,'quiz count '+d.q);ok(d.types.length===3,'quiz types '+d.types);ok(d.dup===0,'no duplicate quiz ids');ok(d.walk===15,'15 walkthroughs');ok(d.con>=9,'explainers '+d.con);ok(d.flows>=7,'flows '+d.flows);ok(d.miss.length===0,'flow/story lab ids exist '+d.miss);ok(d.lv===8&&d.lvOk,'8 level mocks, each task at its level');ok(d.labs===233,'233 labs');
await p.goto('file://'+process.cwd()+'/index.html#visualize');await p.waitForTimeout(800);
ok(await p.locator('.an-tab').count()===10,'visualize has 10 tabs');
await p.locator('.an-tab',{hasText:'StatefulSet canary'}).click();await p.waitForTimeout(300);
ok(await p.locator('#anStage .cp-it').count()===4,'canary scene shows four pods');
await p.click('#anNext');await p.waitForTimeout(200);
ok((await p.locator('#anCap').innerText()).includes('partition'),'step 2 caption mentions partition');
await p.locator('.an-tab',{hasText:'Policy peers'}).click();await p.waitForTimeout(300);ok(await p.locator('#anStage .cp-it').count()===2,'peer scene shows two chips');
await p.goto('file://'+process.cwd()+'/index.html#field');await p.waitForTimeout(500);
await p.click('[data-t="concepts"]');ok(await p.locator('.cp-tabs [role=tab]').count()>=9,'field guide concepts >= 9');
await p.goto('file://'+process.cwd()+'/index.html#exam');await p.waitForTimeout(800);
ok(await p.locator('.ex-b',{hasText:'Mock · Beginner'}).count()>=2,'level mocks listed');
await p.locator('.ex-b',{hasText:'CKA Mock · Beginner'}).first().click();await p.waitForTimeout(2500);
ok(await p.evaluate(()=>!!(KL.exam&&KL.exam.active)),'level mock starts');
ok(errs.length===0,'no page errors '+errs.join('|'));
await b.close();process.exit(bad?1:0)})()
