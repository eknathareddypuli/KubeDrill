// numbered full mocks: fixed task sets, no overlap between numbers, repeatable, a hard set
const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1300,height:850}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++};
await pg.goto(BASE);await pg.waitForTimeout(800);await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});
await pg.goto(BASE+'#exam');await pg.waitForSelector('.ex-b');
const ids=await pg.$$eval('.ex-b',e=>e.map(x=>x.dataset.b));
for(const id of ['cka-full-1','cka-full-2','cka-full-3','ckad-full-1','ckad-full-2','ckad-full-3','cks-full-1','cks-full-2','cka-full-hard','ckad-full-hard','cks-full-hard'])ok(ids.includes(id),'bundle offered: '+id);
async function tasks(id){await pg.goto(BASE+'#exam');await pg.waitForSelector('.ex-b');await pg.click('.ex-b[data-b="'+id+'"]');await pg.waitForSelector('#exFinish');
  const hs=await pg.$$eval('.ex-list a',e=>e.map(x=>x.getAttribute('href')));const a=await pg.evaluate(()=>KL.exam.active&&KL.exam.active.ids);await pg.evaluate(()=>{KL.exam.active=null;try{localStorage.removeItem('kubedrill:exam-active')}catch(e){}});return a||hs}
for(const t of ['cka','ckad','cks']){const n=t==='cks'?2:3;const sets=[];for(let k=1;k<=n;k++)sets.push(await tasks(t+'-full-'+k));
  ok(sets.every(s=>s.length===16),t.toUpperCase()+' fixed mocks have 16 tasks');
  const base=s=>s.map(x=>x.split('~')[0]);const flat=[].concat(...sets.map(base));ok(new Set(flat).size===flat.length,t.toUpperCase()+' fixed mocks share no task');
  const again=await tasks(t+'-full-1');ok(JSON.stringify(again)===JSON.stringify(sets[0]),t.toUpperCase()+' mock 1 is identical on a second start (same variants too)');
  const hard=await tasks(t+'-full-hard');ok(hard.length===16,t.toUpperCase()+' hard mock has 16 tasks');}
ok(errs.length===0,'no page errors '+errs.join('|').slice(0,160));
console.log(bad?bad+' FAILED':'all fixed-mock checks OK');await b.close();process.exit(bad?1:0)})();
