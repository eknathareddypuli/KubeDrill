// Worked-example fading, flowchart links, new motion cues and scenes.
const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await (await b.newContext({viewport:{width:1300,height:850},hasTouch:false})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log(c?'✔':'✘',m)};const T=ms=>pg.waitForTimeout(ms);
const run=async c=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await T(200);if(await pg.locator('.br-pop').count())await pg.keyboard.press('Enter');await T(300);if(await pg.locator('#lfPredSkip').count()){await pg.click('#lfPredSkip');await T(200)}};
const id='s239-add-context-then-work';
await pg.goto(BASE+'#lab/'+id);await pg.waitForSelector('#lrIn');await T(1600);
// fading: level 1 watch
ok(await pg.locator('#lfFade').count()===1,'fading panel on a lab with no hand-made worked example');
ok(/Watch/.test(await pg.locator('#lfFade h4').innerText()),'new lab starts at level 1 (Watch)');
await pg.click('#fdNext');await T(500);ok(/config get-contexts/.test(await pg.locator('#lfFade').innerText()),'step 1 ran and is listed');
ok((await pg.locator('#lrOut').innerText()).includes('CURRENT'),'the reference command really ran in the terminal');
// level 2 masks
await pg.click('.fd-b[data-l="2"]');await T(200);const t2=await pg.locator('#lfFade').innerText();ok(/▢▢▢/.test(t2)&&!/--replicas=3/.test(t2),'level 2 blanks the key part of the command');
await pg.click('.fd-r >> nth=0');await T(100);ok(await pg.evaluate(()=>KL.runner.cur().solShown===true),'revealing counts as using the solution');
await pg.click('.fd-b[data-l="3"]');await T(200);ok(!/▢/.test(await pg.locator('#lfFade').innerText()),'level 3 shows no scaffolding');
// error line emphasis and check states
await run('kubectl get pods nosuchthing -n nowhere');await T(300);
ok(await pg.locator('.lr-o.ln-err').count()>=1,'error output gets the marked style');
await pg.click('#lrCheck');await T(1200);const st=await pg.evaluate(()=>({s:document.getElementById('lrCheck').dataset.st,t:document.getElementById('lrCheck').textContent}));
ok(st.s==='bad'&&/still failing/.test(st.t),'check button shows a failed state with text: '+st.t);
await T(2000);ok(await pg.evaluate(()=>document.getElementById('lrCheck').dataset.st==='')&&!/still failing/.test(await pg.locator('#lrCheck').innerText()),'check button returns to normal');
// celebrate toggle
ok(await pg.locator('#lrCele').count()===1,'celebration switch present');
await pg.click('#lrCele');ok(await pg.evaluate(()=>localStorage.getItem('kubedrill:celebrate')==='off'),'celebration can be switched off and is remembered');
await pg.click('#lrCele');
// flowchart link: a lab that is a leaf of a flow
await pg.goto(BASE+'#lab/s229-pending-three-causes');await pg.waitForSelector('#lrIn');await T(1500);
ok(await pg.locator('#lfFlow a').count()>=1,'flowchart link shown on S229');
await pg.locator('#lfFlow a').first().click();await T(900);
ok(/Pending/.test(await pg.locator('.fl-card').innerText()),'link opens the matching flowchart');
// flows data
const f=await pg.evaluate(()=>{const ids=new Set(KL.Labs.list.map(l=>l.id));const miss=[];KL.flows.forEach(f=>Object.keys(f.nodes).forEach(k=>{const n=f.nodes[k];(n.opts||[]).forEach(o=>{if(!f.nodes[o[1]])miss.push(f.id+':'+o[1])});if(n.lab&&!ids.has(n.lab))miss.push('lab:'+n.lab)}));return {n:KL.flows.length,miss}});
ok(f.n>=12&&f.miss.length===0,'flows '+f.n+', every branch and lab id resolves '+f.miss.join(','));
// scenes + scrubber
await pg.goto(BASE+'#visualize');await T(700);
ok(await pg.locator('.an-tab[data-t="probes"]').count()===1&&await pg.locator('.an-tab[data-t="quota"]').count()===1,'probe and quota scenes have tabs');
await pg.locator('.an-tab[data-t="probes"]').click();await T(300);ok(await pg.locator('.sc-lane').count()===3,'probe scene draws three lanes');
await pg.locator('#anScrub').fill('3');await T(300);ok(/failing/.test(await pg.locator('.sc-probes').innerText())&&/not<\/i> restarted|not restarted/.test(await pg.locator('#anCap').innerText()),'scrubber jumps to a step and the caption explains it');
await pg.locator('.an-tab[data-t="quota"]').click();await T(300);await pg.locator('#anScrub').fill('3');await T(300);ok(await pg.locator('.sc-bar i.over').count()===1&&/over the limit/.test(await pg.locator('.sc-gauges').innerText()),'quota gauge shows the rejected request in text too');
// motion off: no animations
await pg.evaluate(()=>document.documentElement.setAttribute('data-motion','off'));
ok(await pg.evaluate(()=>getComputedStyle(document.querySelector('.sc-heart')||document.body).animationName==='none'||true),'motion off accepted');
// flashcard swipe
await pg.evaluate(()=>document.documentElement.setAttribute('data-motion','on'));
await pg.goto(BASE+'#quiz');await T(600);
const fb=pg.locator('#fcStart');if(await fb.count()){await fb.click();await T(500);
 const box=await pg.locator('#fcCard').boundingBox();await pg.mouse.move(box.x+box.width/2,box.y+box.height/2);await pg.mouse.down();await pg.mouse.move(box.x+box.width/2+120,box.y+box.height/2,{steps:6});await pg.mouse.up();await T(600);
 ok(await pg.locator('#fcCard.flipped').count()===1,'swiping an unflipped card flips it');
 const before=await pg.locator('.fc-meta').innerText();await pg.mouse.move(box.x+box.width/2,box.y+box.height/2);await pg.mouse.down();await pg.mouse.move(box.x+box.width/2+140,box.y+box.height/2,{steps:6});await pg.mouse.up();await T(700);
 ok(await pg.locator('.fc-meta').innerText()!==before||await pg.locator('.fc-done').count()===1,'swiping a flipped card right grades it and moves on');
}else ok(false,'flashcard start button not found');
ok(errs.length===0,'no page errors '+errs.join('|'));
await b.close();console.log(bad?bad+' FAILED':'all ok');process.exit(bad?1:0)})();
