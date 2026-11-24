// Trainers page: weak-spot session, explain-the-error, docs search, study plan.
const {chromium}=require('playwright-core');let bad=0;const ok=(c,m)=>{console.log((c?'✔ ':'✘ ')+m);if(!c)bad++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1200,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const U='file://'+process.cwd()+'/index.html';
await p.goto(U+'#trainers');await p.waitForTimeout(900);
ok(await p.locator('.tr-tabs .an-tab').count()===4,'four trainer tabs');
ok(await p.locator('.tr-row').count()>=6,'weak-spot rows shown');
// weak-spot session: answer wrong then right, records go to the quiz store
await p.click('#trStart');await p.waitForTimeout(200);
ok(await p.locator('.tr-opt').count()>=2,'session shows a question');
const before=await p.evaluate(()=>Object.keys(KL.store.data().quiz).length);
for(let i=0;i<6;i++){const q=await p.evaluate(()=>KL.trainers&&document.querySelector('.tr-q').textContent);await p.locator('.tr-opt').first().click();await p.waitForTimeout(80);ok(await p.locator('.tr-exp').count()===1,'feedback after answer '+(i+1));await p.click('#trNext');await p.waitForTimeout(80);}
ok(/Session done/.test(await p.locator('.tr-card h3').first().innerText()),'session ends with a summary');
ok(await p.locator('.tr-card a[href^="#lab/"]').count()===1,'next lab suggested');
ok(await p.evaluate(()=>Object.keys(KL.store.data().quiz).length)>before,'answers recorded in the quiz store');
// the weak list changes after wrong answers
const first=await p.evaluate(()=>KL.trainers.quizWeakness()[0].cat);ok(!!first,'weakness ranking has a top topic: '+first);
// explain the error
await p.locator('.tr-tabs .an-tab',{hasText:'Explain the error'}).click();await p.click('#mcGo');await p.waitForTimeout(150);
ok(await p.locator('.tr-err').count()===1,'error text shown');
await p.locator('.tr-opt').nth(3).click();ok(await p.locator('.tr-opt.good').count()===1,'right answer revealed');
await p.click('#mcNext');
ok(await p.evaluate(()=>KL.errTrainer.every(x=>x[3].length===4&&x[4]>=0&&x[4]<4)),'every error item well formed');
// docs search
await p.locator('.tr-tabs .an-tab',{hasText:'Docs search'}).click();await p.click('#mcGo');await p.waitForTimeout(150);
ok(await p.locator('.tr-opt').count()===4,'docs question has four options');
ok(await p.evaluate(()=>KL.docsTrainer.every(x=>x[2].length===4&&x[3]>=0&&x[3]<4)),'every docs item well formed');
// plan
await p.locator('.tr-tabs .an-tab',{hasText:'Study plan'}).click();
const d=new Date(Date.now()+42*86400000);const ds=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
await p.fill('#plDate',ds);await p.fill('#plHours','8');await p.click('#plGo');await p.waitForTimeout(300);
const pl=await p.evaluate(()=>{const x=JSON.parse(localStorage.getItem('kubedrill:trainers')).plan;const mins=x.days.map(d=>d.items.reduce((a,i)=>a+i.mins,0));return {n:x.days.length,mocks:x.days.filter(d=>d.items.some(i=>i.t==='mock')).length,last:x.days[x.days.length-1].items[0].t,labs:x.days.reduce((a,d)=>a+d.items.filter(i=>i.t==='lab').length,0),max:Math.max(...mins),rest:x.days.filter(d=>d.items[0].t==='rest').length}});
ok(pl.n===42,'plan covers 42 days: '+pl.n);ok(pl.mocks>=1,'plan has mock days');ok(pl.last==='rest','last day is a rest day');ok(pl.labs>=20,'plan schedules labs: '+pl.labs);ok(pl.max<=8*60/6+90,'no day is overloaded: '+pl.max+' min');ok(pl.rest>=5,'rest days present');
ok(await p.locator('.tr-day.today').count()===1,'today is highlighted');
await p.locator('[data-pk]').first().check();ok(await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('kubedrill:trainers')).planDone).length===1),'ticking an item is saved');
await p.fill('#plDate',ds.slice(0,8)+'01');await p.fill('#plDate',new Date(Date.now()+2*86400000).toISOString().slice(0,10));await p.click('#plGo');ok((await p.locator('#plErr').innerText()).length>0,'a too-near exam date is refused');
// reduced-data safety: reload keeps the plan
await p.reload();await p.waitForTimeout(700);await p.locator('.tr-tabs .an-tab',{hasText:'Study plan'}).click();ok(await p.locator('.tr-week').count()>=6,'plan survives a reload');
ok(errs.length===0,'no page errors '+errs.join('|'));
await b.close();process.exit(bad?1:0)})()
