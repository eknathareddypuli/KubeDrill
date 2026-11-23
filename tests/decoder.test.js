// Decoder rules: every rule's example must match its own rule (and the best hit must be that rule or a more specific one listed before it),
// every practice lab must exist, and real simulator output for faulty labs must be decoded.
const path = require('path'), fs = require('fs');
global.KL = {}; const D = require('../assets/js/data/decoder-data.js');
const Sim = require('../assets/js/sim.js'); ['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2','sim-extras','sim-csr','sim-explain'].forEach(f => require('../assets/js/' + f + '.js'));
const Labs = require('../assets/js/labs-engine.js'); global.KL.Labs = Labs;
for (const f of fs.readdirSync(path.join(__dirname, '../assets/js/data')).filter(x => /^labs-sim-.*\.js$/.test(x)).sort()) require('../assets/js/data/' + f);
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('✘', m); } };
const ids = new Set();
for (const r of D.rules) {
  ok(!ids.has(r.id), 'duplicate rule id ' + r.id); ids.add(r.id);
  ok(r.title && r.plain && r.fix && r.trap && r.look && r.look.length, 'rule incomplete: ' + r.id);
  ok(Labs.byId[r.lab], 'rule ' + r.id + ' names a missing lab ' + r.lab);
  const hits = D.decode(r.ex, 10);
  ok(hits.some(h => h.id === r.id), 'example of ' + r.id + ' does not match its own rule');
  ok(hits.length && hits[0].id !== undefined, 'no hit for ' + r.id);
  ok(!/\{\d\}/.test(JSON.stringify(hits.find(h => h.id === r.id) || {})), 'unfilled placeholder in ' + r.id);
  r.look.forEach(c => ok(/^(kubectl|systemctl|journalctl|crictl|openssl|kubeadm|grep|sed|echo|helm|swapon|df|date)\b/.test(c), 'odd command in ' + r.id + ': ' + c));
}
// simulator output of broken labs must decode
const EXPECT = { 's02-imagepull': ['img-backoff', 'img-tag', 'img-auth', 'img-name'], 's03-oomkilled': ['oom', 'crash'], 's01-pending-cpu': ['sched-resources'], 's04-no-endpoints': ['noendpoints'], 's05-config-error': ['cfg-missing', 'cfg-key', 'crash'], 's35-taint-toleration': ['sched-taint'], 's34-nodeselector': ['sched-selector'], 's13-pvc-pending': ['pvc-unbound'], 's48-quota-pods': ['quota'], 's08-probes': ['probe'], 's31-init-container': ['init'], 's32-cm-env-missing': ['cfg-key', 'cfg-missing'] };
for (const id of Object.keys(EXPECT)) {
  const lab = Labs.byId[id]; if (!lab) { ok(false, 'no lab ' + id); continue; }
  const s = new Sim(); Labs.setup(s, lab); s.settle(30);
  const txt = ['kubectl get pods -A', 'kubectl describe pods -A', 'kubectl get events -A', 'kubectl describe nodes', 'kubectl get endpoints -A', 'kubectl describe svc -A', 'kubectl describe rs -A', 'kubectl describe deploy -A'].map(c => { const r = s.exec(c); return (r.stdout || '') + (r.stderr || ''); }).join('\n');
  const hits = D.decode(txt, 12).map(h => h.id);
  ok(EXPECT[id].some(e => hits.includes(e)), id + ': simulator output not decoded (got ' + hits.join(',') + ')');
}
console.log(bad ? bad + ' decoder problems' : 'decoder OK (' + D.rules.length + ' rules, ' + Object.keys(EXPECT).length + ' simulator cases)'); process.exit(bad ? 1 : 0);
