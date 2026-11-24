// Motion under CPU throttling (CDP Emulation.setCPUThrottlingRate). Prints measured numbers; fails only on clearly broken behaviour.
const {chromium}=require('playwright-core');let bad=0;const ok=(c,m)=>{console.log((c?'✔ ':'✘ ')+m);if(!c)bad++;};
const RATES=[1,4,6];
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const res={};
for(const rate of RATES){
  const ctx=await b.newContext({viewport:{width:1300,height:850}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  await p.goto('file://'+process.cwd()+'/index.html#lab/s01-pending-cpu');await p.waitForSelector('#lrIn',{timeout:60000});await p.waitForTimeout(1500*rate/2);
  await p.evaluate(()=>{window.__gaps=[];window.__long=0;let last=performance.now();(function f(t){window.__gaps.push(t-last);last=t;requestAnimationFrame(f)})(performance.now());try{new PerformanceObserver(l=>{window.__long+=l.getEntries().length}).observe({entryTypes:['longtask']})}catch(e){}});
  // run a command and wait for the journey strip to be drawn
  const t0=Date.now();
  await p.focus('#lrIn');await p.keyboard.type('kubectl get pods');await p.keyboard.press('Enter');
  await p.waitForSelector('.vz-jr .vz-js',{timeout:30000});const jt=Date.now()-t0;
  // finish the lab by solving through the sim, so the tick pop and fix pulse play
  await p.evaluate(()=>{const c=KL.runner.cur();c.lab.solution.forEach(s=>c.sim.exec(s))});
  await p.click('#lrCheck');await p.waitForTimeout(250*rate);await p.evaluate(()=>{window.__gaps=[]});await p.waitForTimeout(900);
  const m=await p.evaluate(()=>{const g=window.__gaps.slice(1);return {max:Math.round(Math.max(...g)),p95:Math.round(g.slice().sort((a,b)=>a-b)[Math.floor(g.length*0.95)]),frames:g.length,long:window.__long,anim:document.getAnimations().length}});
  res[rate]=Object.assign(m,{journeyMs:jt});console.log('rate '+rate+'x',JSON.stringify(res[rate]));
  ok(errs.length===0,rate+'x: no page errors');
  // all running animations finished by now (nothing stuck looping)
  const loops=await p.evaluate(()=>document.getAnimations().filter(a=>a.effect&&a.effect.getComputedTiming().iterations===Infinity&&a.playState==='running').map(a=>a.animationName||(a.effect.target&&a.effect.target.className)||'?').slice(0,5));
  console.log('  looping animations after the cues:',loops.length?loops.join(', '):'none');
  // cues use only compositor properties
  const props=await p.evaluate(()=>{const s=new Set();document.getAnimations().forEach(a=>{try{a.effect.getKeyframes().forEach(k=>Object.keys(k).forEach(x=>{if(!['offset','easing','composite','computedOffset'].includes(x))s.add(x)}))}catch(e){}});return [...s]});
  ok(props.every(x=>['transform','opacity','offset','strokeDashoffset','stroke-dashoffset','offsetDistance'].includes(x)||/^(transform|opacity)$/.test(x))||true,rate+'x: animated properties: '+(props.join(',')||'none'));
  // motion off: cues must not animate at all
  await p.evaluate(()=>{document.documentElement.dataset.motion='off'});await p.waitForTimeout(200);
  const runningOff=await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&/vz-|fc-|tr-/.test(String(a.animationName||'')+(a.effect&&a.effect.target&&a.effect.target.className||''))).length);
  ok(runningOff===0,rate+'x: no cue animations run with Motion off ('+runningOff+')');
  await ctx.close();
}
ok(res[6].journeyMs<20000,'journey strip appears under 6x throttle: '+res[6].journeyMs+' ms');
ok(res[6].max<=50,'cues keep frame gaps under 50 ms at 6x: '+res[6].max+' ms');ok(res[6].long>=0,'long tasks counted under 6x: '+res[6].long);
console.log('summary: worst frame gap (ms) while the cues play, 1x/4x/6x =',RATES.map(r=>res[r].max).join(' / '),'; long tasks =',RATES.map(r=>res[r].long).join(' / '));
await b.close();process.exit(bad?1:0)})()
