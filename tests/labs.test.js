// Runs every interactive lab: broken state must FAIL checks, applying the solution must PASS all tasks.
const path=require('path');
const Sim=require('../assets/js/sim.js');['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2','sim-extras','sim-csr'].forEach(f=>require('../assets/js/'+f+'.js'));
const Labs=require('../assets/js/labs-engine.js');
const fs=require('fs');
for(const f of fs.readdirSync(path.join(__dirname,'../assets/js/data')).filter(x=>/^labs-sim-.*\.js$/.test(x)).sort()) require('../assets/js/data/'+f);
require('../assets/js/data/lab-meta.js');
global.KL=global.KL||{};require('../assets/js/data/debrief.js');require('../assets/js/data/debrief-j.js');require('../assets/js/data/debrief-k.js');require('../assets/js/data/debrief-l.js');
let bad=0, only=process.argv[2];
for(const l of Labs.list){ const d=(globalThis.KL.debrief||{})[l.id]; if(!d||d.length!==4||d.some(x=>!x)){bad++;console.log('✘ missing debrief',l.id);} }
const VARS=Object.keys(Labs.byId).filter(k=>Labs.byId[k].variantOf).map(k=>Labs.byId[k]);
for(const lab of Labs.list.concat(VARS)){
  if(only && lab.id.indexOf(only)<0) continue;
  const s=new Sim();
  try{ Labs.setup(s,lab);}catch(e){console.log('✘',lab.id,'SETUP:',e.message);bad++;continue;}
  const before=Labs.check(s,lab);
  const r=s.exec(lab.solution.join('\n'));
  s.settle(30);
  let after=Labs.check(s,lab), stage='';
  const errs=(r.stderr||'').trim();
  const allFailBefore=before.passed<before.total;
  let stageBad=false;
  if(lab.stage2){
    // stage 1 done => lab not yet complete (stage 2 pending), then the hidden fault appears and must fail, then its solution must pass
    if(!Labs.stage1Done(s,lab)) { stageBad=true; console.log('    stage1 not done after solution'); }
    Labs.applyStage2(s,lab); s.settle(10);
    const mid=Labs.check(s,lab); if(mid.ok||mid.passed!==lab.tasks.length) { stageBad=true; console.log('    stage2 must start broken:',mid.passed+'/'+mid.total); }
    s.exec(lab.stage2.solution.join('\n')); s.settle(30); after=Labs.check(s,lab); stage=' +stage2';
  }
  if(lab.constraint&&lab.constraint.assert){ const bc=Labs.check(new Sim(),lab); }
  if(!after.ok||!allFailBefore||stageBad){bad++;console.log('✘',lab.id,'before',before.passed+'/'+before.total,'after',after.passed+'/'+after.total);
    after.tasks.forEach((t,i)=>t.results.forEach(x=>{if(!x.ok)console.log('    after FAIL task',t.id,x.msg)}));
    if(after.constraint&&!after.constraint.ok) console.log('    constraint broken:',after.constraint.msgs.join(' | '));
    if(!allFailBefore) before.tasks.forEach(t=>{ if(t.ok) console.log('    already passing before: task',t.id)});
    if(errs)console.log('    stderr:',errs.split('\n').slice(0,4).join(' | '));
  } else console.log('✔',lab.id,before.passed+'/'+before.total,'→',after.passed+'/'+after.total+stage, errs?('  (stderr: '+errs.split('\n')[0].slice(0,80)+')'):'');
}
console.log(bad?('\n'+bad+' lab(s) FAILED'):'\nall labs OK ('+Labs.list.length+')'); if (bad) process.exit(1);
// session persistence: dump mid-lab → JSON → fresh Sim.load → finish with the solution → must pass
{
  let bad2 = 0;
  for (const lab of Labs.list.concat(VARS)) {
    const a = new Sim(); Labs.setup(a, lab);
    const sol = lab.solution, half = Math.max(1, Math.floor(sol.length / 2));
    a.exec(sol.slice(0, half).join('\n')); a.settle(5);
    let b = new Sim().load(JSON.parse(JSON.stringify(a.dump())));
    b.exec(sol.slice(half).join('\n')); b.settle(30);
    if (lab.stage2) { Labs.applyStage2(b, lab); b.settle(10); b = new Sim().load(JSON.parse(JSON.stringify(b.dump()))); if (!Labs.stage2Active(b, lab)) { bad2++; console.log('✘ stage2 flag lost in persist', lab.id); } b.exec(lab.stage2.solution.join('\n')); b.settle(30); }
    const r = Labs.check(b, lab); if (!r.ok) { bad2++; console.log('✘ persist round-trip', lab.id, r.passed + '/' + r.total); }
  }
  console.log(bad2 ? bad2 + ' round-trip FAILURES' : 'persist round-trip OK (' + (Labs.list.length + VARS.length) + ' labs incl. variants)'); if (bad2) process.exit(1);
}
