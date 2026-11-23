// Proves the durability and collateral checks can FAIL (positive case is covered by labs.test.js for all labs).
const Sim=require('../assets/js/sim.js');['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2','sim-extras','sim-csr','sim-explain'].forEach(f=>require('../assets/js/'+f+'.js'));
const Labs=require('../assets/js/labs-engine.js');
let bad=0; const ok=(c,m)=>{ if(!c){bad++;console.log('✘',m);} else console.log('✔',m); };
const mk=id=>({id,num:0,title:id,diff:1,track:['cka'],domain:'x',time:5,ns:'dl',story:'',caution:'',setup:[],
  setupCmds:['kubectl -n dl create deployment web --image=nginx:nope --replicas=2','kubectl -n dl create configmap keep --from-literal=a=b','kubectl -n dl create quota q --hard=pods=10'],
  files:[],tasks:[{id:'t1',title:'web ready',desc:'',hints:[],assert:[{t:'podsReady',ns:'dl',sel:'app=web',min:2}]}],solution:['kubectl -n dl set image deployment/web nginx=nginx:1.25'],cleanupCmds:[]});
const lab=mk('dur-a'); const s=new Sim(); Labs.setup(s,lab);
// positive
s.exec(lab.solution.join('\n')); s.settle(40); let r=Labs.check(s,lab); if(!r.ok) console.log(JSON.stringify(r.tasks.map(t=>t.results.map(x=>x.msg)))+JSON.stringify(r.extras)); ok(r.ok,'template fix is durable ('+JSON.stringify(r.extras.map(x=>x.kind))+')');
// negative durable: patch the running pods in place (valid k8s: pod image is mutable); the Deployment template stays broken
const lab3=mk('dur-c'); const s3=new Sim(); Labs.setup(s3,lab3); s3.settle(20);
s3.exec('kubectl -n dl get pods -o name').stdout.trim().split('\n').forEach(n=>s3.exec('kubectl -n dl set image '+n+' nginx=nginx:1.25')); s3.settle(40);
const b3=Labs.check(s3,lab3,{noExtras:true}); ok(b3.ok,'in-place pod patch passes the plain checks');
const f3=Labs.check(s3,lab3); ok(!f3.ok&&f3.extras.some(x=>x.kind==='durable'),'...but is rejected as not durable');
// negative collateral
const lab4=mk('dur-d'); lab4.solution=['kubectl -n dl set image deployment/web nginx=nginx:1.25']; const s4=new Sim(); Labs.setup(s4,lab4);
s4.exec(lab4.solution.join('\n')); s4.exec('kubectl -n dl delete configmap keep'); s4.exec('kubectl -n dl delete quota q'); s4.settle(40);
const r4=Labs.check(s4,lab4); ok(!r4.ok&&r4.extras.some(x=>x.kind==='collateral'),'deleting protective objects is flagged as over-fix');
console.log(bad?bad+' failed':'durability tests OK'); if(bad)process.exit(1);
// capstone partial credit + red herring over-fix
{
  const path = require('path'), fs = require('fs');
  const Sim = require('../assets/js/sim.js'); ['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2','sim-extras','sim-csr','sim-explain'].forEach(f => require('../assets/js/' + f + '.js'));
  const Labs = require('../assets/js/labs-engine.js');
  for (const f of fs.readdirSync(path.join(__dirname, '../assets/js/data')).filter(x => /^labs-sim-.*\.js$/.test(x)).sort()) require('../assets/js/data/' + f);
  const assert = require('assert');
  const cap = Labs.byId['s170-capstone-cka'];
  let s = new Sim(); Labs.setup(s, cap);
  assert.strictEqual(Labs.check(s, cap).score.earned, 0, 'capstone starts at 0');
  s.exec('kubectl create pdb web-pdb --selector=app=web --min-available=2 -n cap-cka'); s.exec("kubectl patch cronjob backup -n cap-cka -p '{\"spec\":{\"suspend\":false,\"concurrencyPolicy\":\"Forbid\"}}'"); s.settle(10);
  const part = Labs.check(s, cap); assert.strictEqual(part.score.earned, 22, 'partial credit = 12+10'); assert(!part.ok);
  s = new Sim(); Labs.setup(s, cap); s.exec(cap.solution.join('\n')); s.settle(30);
  const full = Labs.check(s, cap); assert.strictEqual(full.score.earned, 100); assert(full.ok);
  console.log('✔ capstone partial credit (22) and full score (100)');
  const rh = Labs.byId['s01-pending-cpu']; assert(rh.redHerring);
  s = new Sim(); Labs.setup(s, rh); s.exec(rh.solution.join('\n')); s.settle(30);
  assert(Labs.check(s, rh).ok, 'solution passes with decoys present');
  s.exec('kubectl delete deployment legacy-report -n kd-noise'); s.settle(5);
  const r = Labs.check(s, rh); assert(!r.ok || (r.extras && r.extras.length), 'deleting a decoy is flagged');
  console.log('✔ red herring: solution passes, deleting a decoy is flagged');
}
