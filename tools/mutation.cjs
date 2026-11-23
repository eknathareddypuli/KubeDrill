// Mutation testing of the checkers: delete ONE mutating command from a lab's reference solution; the checker must then FAIL.
// A surviving mutant means the command is redundant, or (more likely) the checker cannot see what that command fixed.
const Sim=require('../assets/js/sim.js');['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2','sim-extras','sim-csr','sim-explain'].forEach(f=>require('../assets/js/'+f+'.js'));
const Labs=require('../assets/js/labs-engine.js');const fs=require('fs'),path=require('path');
for(const f of fs.readdirSync(path.join(__dirname,'../assets/js/data')).filter(x=>/^labs-sim-.*\.js$/.test(x)).sort()) require('../assets/js/data/'+f);
const ALLOW=(()=>{try{return JSON.parse(fs.readFileSync(path.join(__dirname,'mutation.allow.json'),'utf8'));}catch(e){return {};}})();
const only=process.argv.find(a=>/^s\d/.test(a));
const READ=/^\s*(kubectl\s+(--context \S+\s+)?(rollout (status|history)|exec .* -- (wget|curl|cat|ls|nslookup|env|printenv)|config (get-contexts|current-context)|kustomize|get|describe|logs|top|explain|version|cluster-info|api-resources|auth can-i|config view|events)|cat|ls|echo|grep|less|man|helm (list|history|get|status|show|template|search|repo)|crictl (ps|logs|inspect|images)|journalctl|systemctl (status|is-active|cat)|head|tail|pwd|cd|which|trivy|kubeadm version|kubeadm certs check|mkdir|etcdctl snapshot status|etcdctl (endpoint|alarm list|member list)|stat|aa-status|ssh \S+ '(sudo )?(journalctl|systemctl status|df|du|kubeadm certs check-expiration|kubeadm upgrade plan|cat|ls|systemctl is-active)\b)/;
let survivors=0,mutants=0,labsN=0;
for(const lab of Labs.list){
  if(only&&lab.id.indexOf(only)<0) continue;
  const lines=[]; lab.solution.forEach((cmd,i)=>{ String(cmd).split('\n').forEach((l,j)=>{ if(l.trim()&&!READ.test(l)) lines.push({i,cmd,l}); }); });
  if(lab.simOnly&&!lab.solution.length) continue; labsN++;
  // group by solution entry (heredocs/multi-line entries are removed whole)
  const entries=[...new Set(lines.map(x=>x.i))];
  for(const i of entries){
    const sol=lab.solution.filter((_,k)=>k!==i);
    const s=new Sim(); try{ Labs.setup(s,lab);}catch(e){continue;}
    s.exec(sol.join('\n')); s.settle(30);
    let r=Labs.check(s,lab);
    if(lab.stage2){ if(!r.ok&&!Labs.stage1Done(s,lab)){ mutants++; continue; } Labs.applyStage2(s,lab); s.settle(10); s.exec(lab.stage2.solution.join('\n')); s.settle(30); r=Labs.check(s,lab); }
    mutants++;
    if(r.ok&&!(r.score&&r.score.earned<r.score.total)){ const key=lab.id+'#'+i; if((ALLOW[lab.id]||[]).includes(i)) continue; survivors++; console.log('SURVIVED '+lab.id+' dropped solution['+i+']: '+String(lab.solution[i]).split('\n')[0].slice(0,110)); }
    // stage2 solution mutants
  }
  if(lab.stage2) for(let i=0;i<lab.stage2.solution.length;i++){ if(READ.test(lab.stage2.solution[i])) continue; const s=new Sim(); Labs.setup(s,lab); s.exec(lab.solution.join('\n')); s.settle(30); Labs.applyStage2(s,lab); s.settle(10); s.exec(lab.stage2.solution.filter((_,k)=>k!==i).join('\n')); s.settle(30); mutants++; if(Labs.check(s,lab).ok){ if((ALLOW[lab.id]||[]).includes('s2-'+i)) continue; survivors++; console.log('SURVIVED '+lab.id+' dropped stage2['+i+']: '+String(lab.stage2.solution[i]).slice(0,110)); } }
}
console.log('\n'+labsN+' labs, '+mutants+' mutants, '+survivors+' survived');
if(survivors&&process.argv.includes('--strict')) process.exit(1);
