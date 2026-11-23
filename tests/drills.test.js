// Every drill must fail before its model command and pass after it; every doc race must be answerable with kubectl explain in the simulator.
global.KL = {}; const D = require('../assets/js/data/drills-data.js');
const Sim = require('../assets/js/sim.js'); ['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2','sim-extras','sim-csr','sim-explain'].forEach(f => require('../assets/js/' + f + '.js'));
const Labs = require('../assets/js/labs-engine.js');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('✘', m); } };
function mk(d) { const s = new Sim(); Labs.setup(s, { id: 'drill:' + d.id, ns: D.NS, setupCmds: (d.setup || []).map(c => c + ' -n ' + D.NS), }); (d.setupCmds || []).forEach(c => { const r = s.exec(c); ok(!r.code, d.id + ' setupCmd failed: ' + r.stderr); }); s.exec('export do="--dry-run=client -o yaml" now="--force --grace-period 0"'); s.settle(15); s.ctxNs = D.NS; return s; }
function verdict(s, d, lastOut) {
  let okA = true, msgs = [];
  if (d.assert) { const lab = { id: 'drill', ns: D.NS, tasks: [{ id: '1', title: 't', assert: d.assert }], solution: [] }; const r = Labs._baseCheck ? Labs._baseCheck(s, lab, {}) : Labs.check(s, lab, { noExtras: true }); if (!r.ok) { okA = false; r.tasks.forEach(t => t.results.forEach(x => { if (!x.ok) msgs.push(x.msg); })); } }
  if (d.out) { let re = d.out.re; if (d.out.dyn) { const e = s.exec(d.out.dyn).stdout.trim(); re = '^' + e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'; } if (!new RegExp(re, 'm').test((lastOut || '').trim())) { okA = false; msgs.push('output did not match ' + re); } }
  return { ok: okA, msgs };
}
const seen = new Set();
for (const d of D.DRILLS) {
  ok(!seen.has(d.id), 'duplicate drill ' + d.id); seen.add(d.id);
  ok(d.q && d.par > 0 && d.best && d.tip && D.CATS.includes(d.cat) && (d.assert || d.out), 'drill incomplete ' + d.id);
  const s = mk(d); const b = verdict(s, d, '');
  ok(!b.ok, d.id + ': passes BEFORE any command');
  let last = ''; const cmds = Array.isArray(d.best) ? d.best : [d.best];
  for (const c of cmds) { const r = s.exec(c); last = (r.stdout || '') + (r.stderr || ''); ok(!r.code, d.id + ' best command failed: ' + c + ' → ' + r.stderr); }
  s.settle(15); const a = verdict(s, d, last); ok(a.ok, d.id + ': does not pass after best command: ' + a.msgs.join(' | '));
}
for (const r of D.RACES) {
  const s = new Sim(); const o = s.exec('kubectl explain ' + r.path); const txt = (o.stdout || '') + (o.stderr || '');
  ok(!o.code && r.accept.every(a => txt.includes(a)), r.id + ': kubectl explain ' + r.path + ' does not show ' + r.accept.join('/') + ' (' + txt.split('\n')[0] + ')');
}
console.log(bad ? bad + ' drill problems' : 'drills OK (' + D.DRILLS.length + ' command drills, ' + D.RACES.length + ' doc races)'); process.exit(bad ? 1 : 0);
