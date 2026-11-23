// Every authored trap/why note: the lab exists, the trap names a wrong move, the reasoning has substance, and any "prove it"
// command runs cleanly in the simulator after the lab's solution has been applied.
const fs = require('fs'), path = require('path');
const Labs = require('../tools/lab-env.cjs'); const Sim = require('../assets/js/sim.js');
const T = global.KL.trapsMore || {}; let bad = 0, n = 0;
const fail = (id, m) => { console.log('✘', id, m); bad++; };
for (const id of Object.keys(T)) {
  n++; const lab = Labs.byId[id], m = T[id];
  if (!lab || lab.variantOf) { fail(id, 'no such base lab'); continue; }
  if (!m.trap || m.trap.length < 60) fail(id, 'trap missing or under 60 characters');
  if (!m.why || !Array.isArray(m.why.m) || m.why.m.length < 2 || m.why.m.some(x => String(x).length < 40)) fail(id, 'why needs at least 2 reasons of 40+ characters');
  if (/^(todo|tbd)/i.test(m.trap)) fail(id, 'placeholder trap');
  if (m.why && m.why.p) {
    const s = new Sim(); Labs.setup(s, lab); s.exec(lab.solution.join('\n')); s.settle(30);
    const r = s.exec(m.why.p); const out = typeof r === 'string' ? r : (r && (r.out || r.output || r.stdout)) || JSON.stringify(r);
    if (/Error from server|error:|not found|unknown command/i.test(out)) fail(id, 'prove-it command fails after the solution: ' + m.why.p + ' => ' + String(out).slice(0, 100));
  }
  if (lab && !lab.trap && !lab.why) fail(id, 'note was not applied by lab-meta');
}
const missing = Labs.list.filter(l => !l.trap && !l.why && !(l.constraint && l.constraint.assert && l.constraint.assert.length)).length;
console.log(bad ? 'traps FAILED' : 'traps OK (' + n + ' notes written, ' + missing + ' labs still without a trap)'); process.exit(bad ? 1 : 0);
