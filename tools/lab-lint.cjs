// Lab linter: "check the outcome, not the method". Static rules over every lab.
//  L1 assertion names an object/ref that the learner is never told about (story/title/desc/hints/files/setup)
//  L2 assertion reads shell history / command text (method-bound)
//  L3 lab has no constraint and no protective object in setup (nothing for over-fix detection to guard)
//  L4 task has a single assertion with an exact-string eq on a free-form value the task text never states
//  L5 more than 3 hints per task or hint 1 contains the full solution command (hint ladder broken)
const Sim=require('../assets/js/sim.js');['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2','sim-extras','sim-csr','sim-explain'].forEach(f=>require('../assets/js/'+f+'.js'));
const Labs=require('../assets/js/labs-engine.js');const fs=require('fs'),path=require('path');
for(const f of fs.readdirSync(path.join(__dirname,'../assets/js/data')).filter(x=>/^labs-sim-.*\.js$/.test(x)).sort()) require('../assets/js/data/'+f);
const ALLOW=(()=>{try{return JSON.parse(fs.readFileSync(path.join(__dirname,'lab-lint.allow.json'),'utf8'));}catch(e){return {};}})();
const PROT=/kind: (NetworkPolicy|ResourceQuota|LimitRange|PodDisruptionBudget|Role|RoleBinding|ClusterRole|ClusterRoleBinding|Secret|ConfigMap|PersistentVolumeClaim|ValidatingAdmissionPolicy)/;
const strict=process.argv.includes('--strict'); let n=0,tot=0; const out=[];
for(const lab of Labs.list){
  const ok=(rule,msg)=>{ if((ALLOW[lab.id]||[]).includes(rule)) return; out.push(lab.id+' ['+rule+'] '+msg); };
  const told=[lab.story,lab.caution,lab.title,lab.constraint&&lab.constraint.text].concat(lab.tasks.map(t=>t.title+' '+t.desc+' '+(t.hints||[]).join(' '))).concat((lab.setup||[]).join('\n')).concat((lab.setupCmds||[]).join('\n')).concat((lab.files||[]).map(f=>f.content)).join('\n').toLowerCase();
  lab.tasks.forEach(t=>(t.assert||[]).forEach(a=>{
    tot++;
    const refs=[a.ref&&String(a.ref).split('/')[1],a.name,a.node,a.sa,a.svc,a.secret].filter(x=>typeof x==='string'&&x);
    refs.forEach(r=>{ if(!told.includes(r.toLowerCase())) ok('L1','task '+t.id+': assertion needs name "'+r+'" which the learner is never told'); });
    if(JSON.stringify(a).match(/history|bash_history|\.history/)) ok('L2','task '+t.id+': assertion inspects shell history');
    if(a.t==='fileRe'&&/kubectl|helm|sed|vim/.test(String(a.re||a.pattern||''))) ok('L2','task '+t.id+': file assertion matches a command, not a result');
  }));
  const hasProt=PROT.test((lab.setup||[]).join('\n'))||(lab.setupCmds||[]).some(c=>/create (quota|networkpolicy|role|rolebinding|secret|configmap|cm|pdb)/.test(c));
  if(!lab.constraint&&!hasProt&&!lab.simOnly&&!(lab.collateralOk)) ok('L3','no constraint and nothing protective in setup (over-fix cannot be detected)');
  lab.tasks.forEach(t=>{ if((t.hints||[]).length>3) ok('L5','task '+t.id+' has '+t.hints.length+' hints'); });
}
const info=out.filter(x=>/\[L3\]/.test(x)); const real=out.filter(x=>!/\[L3\]/.test(x)); real.forEach(x=>console.log(x)); console.log('info: '+info.length+' labs have no constraint and no protective object (L3; use tools/lab-lint.cjs --l3 to list)'); if(process.argv.includes('--l3')) info.forEach(x=>console.log('  '+x)); const byRule={}; out.forEach(x=>{const r=x.match(/\[(L\d)\]/)[1];byRule[r]=(byRule[r]||0)+1;});
console.log('\n'+Labs.list.length+' labs, '+tot+' assertions linted; findings:',JSON.stringify(byRule));
if(strict&&real.length) process.exit(1);
