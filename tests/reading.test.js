// Reading labs and explain-the-diff: every item must be grounded. Reading evidence comes from the simulator and must contain its clue;
// diffs must reproduce in the simulator (A is healthy, B shows the stated fault) or be explicitly marked as API-rule-only.
const Labs = require('../tools/lab-env.cjs'), Sim = require('../assets/js/sim.js');
require('../assets/js/data/reading-core.js'); require('../assets/js/data/reading-data.js');
const RC = KL.readingCore, R = KL.reading; let bad = 0;
const fail = (id, m) => { console.log('✘', id, m); bad++; };
const ids = new Set();
for (const it of R.ITEMS) {
  if (ids.has(it.id)) fail(it.id, 'duplicate id'); ids.add(it.id);
  if (!Labs.byId[it.lab]) { fail(it.id, 'no such lab ' + it.lab); continue; }
  const b = RC.build(it, Sim, Labs), hits = b.lines.filter(l => l.hit).length;
  if (!b.right || b.right.length < 30) fail(it.id, 'no root cause in the debrief');
  if (hits < 1) fail(it.id, 'the evidence does not contain the clue (ev matches 0 lines)');
  if (hits > 8) fail(it.id, 'ev matches ' + hits + ' lines, too many to be a clue');
  if (b.lines.length > 70) fail(it.id, 'evidence is ' + b.lines.length + ' lines, trim it');
  if (b.wrong.length < 3 || new Set(b.wrong.concat([b.right])).size !== b.wrong.length + 1) fail(it.id, 'needs 3 distinct wrong causes');
  if (it.wrong.indexOf(it.lab) >= 0) fail(it.id, 'the right lab is listed as wrong');
  if (/\$ .*\n\s*\n?No resources found/.test(b.text) && hits === 0) fail(it.id, 'evidence is empty');
}
for (const d of R.DIFFS) {
  if (ids.has(d.id)) fail(d.id, 'duplicate id'); ids.add(d.id);
  if (d.a === d.b) fail(d.id, 'a and b are identical');
  if (!RC.badLines(d).length || RC.badLines(d).length !== d.bad.length) fail(d.id, 'bad lines do not resolve in b');
  if (!d.why || !d.why.right || d.why.wrong.length < 3) fail(d.id, 'needs a right reason and 3 wrong ones');
  if (d.lab && !Labs.byId[d.lab]) fail(d.id, 'no such lab ' + d.lab);
  if (d.sim) {
    const A = RC.runDiff(d, 'a', Sim), B = RC.runDiff(d, 'b', Sim);
    if (!new RegExp(d.sim.okA, 'mi').test(A)) fail(d.id, 'A does not look healthy. Wanted /' + d.sim.okA + '/ in:\n' + A);
    if (!new RegExp(d.sim.okB, 'mi').test(B)) fail(d.id, 'B does not show the fault. Wanted /' + d.sim.okB + '/ in:\n' + B);
    if (new RegExp(d.sim.okB, 'mi').test(A)) fail(d.id, 'the fault pattern also matches A');
    if (new RegExp(d.sim.okA, 'mi').test(B) && !/Running/.test(d.sim.okA)) fail(d.id, 'the healthy pattern also matches B');
  } else if (!d.symptom || d.symptom.length < 30) fail(d.id, 'an API-rule-only diff needs a symptom text');
}
console.log(bad ? 'reading FAILED' : 'reading OK (' + R.ITEMS.length + ' reading labs, ' + R.DIFFS.length + ' diffs: ' + R.DIFFS.filter(d => d.sim).length + ' reproduced in the simulator, ' + R.DIFFS.filter(d => !d.sim).length + ' API-rule only)'); process.exit(bad ? 1 : 0);
