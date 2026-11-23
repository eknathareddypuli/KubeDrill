#!/usr/bin/env node
/* Teaching-quality lint. Checks what makes a lab teach rather than just test:
   TQ1 every task has at least 2 hints, and hint 1 is a nudge (it does not contain a full solution command)
   TQ2 every lab has a debrief of 4 non-trivial parts (root cause, fix, how to spot it, what to remember), each at least 24 characters
   TQ3 every lab names the tempting wrong move (trap) or why it matters (why), or has a constraint that punishes it
   TQ4 every lab maps to at least one competency and at least one official-docs link
   TQ5 the story states a symptom or goal and does not contain the solution command
   TQ6 task titles are not copies of the solution
   Usage: node tools/teach-lint.cjs [--strict] [--list]; findings in tools/teach-lint.allow.json are accepted (id → [codes]). */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
global.KL = {};
const Sim = require(path.join(root, 'assets/js/sim.js')); ['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2','sim-extras','sim-csr','sim-explain'].forEach(f => require(path.join(root, 'assets/js', f + '.js')));
const Labs = require(path.join(root, 'assets/js/labs-engine.js')); global.KL.Labs = Labs;
// same order as index.html: competencies load after labs-sim-k and before labs-sim-l
const LS = fs.readdirSync(path.join(root, 'assets/js/data')).filter(x => /^labs-sim-.*\.js$/.test(x)).sort();
for (const f of LS.filter(x => x <= 'labs-sim-k.js')) require(path.join(root, 'assets/js/data', f));
require(path.join(root, 'assets/js/data/competencies.js'));
for (const f of LS.filter(x => x > 'labs-sim-k.js')) require(path.join(root, 'assets/js/data', f));
require(path.join(root, 'assets/js/data/sources.js'));
for (const f of ['debrief', 'debrief-j', 'debrief-k', 'debrief-l']) require(path.join(root, 'assets/js/data', f + '.js'));
require(path.join(root, 'assets/js/data/hint-ladder.js')); require(path.join(root, 'assets/js/data/variants-auto.js')); fs.readdirSync(path.join(root, 'assets/js/data')).filter(x => /^traps-.*\.js$/.test(x)).sort().forEach(x => require(path.join(root, 'assets/js/data', x))); require(path.join(root, 'assets/js/data/lab-meta.js'));
const ALLOW = fs.existsSync(path.join(__dirname, 'teach-lint.allow.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'teach-lint.allow.json'), 'utf8')) : {};
const strict = process.argv.includes('--strict'), list = process.argv.includes('--list');
const norm = s => String(s).toLowerCase().replace(/[`'"\s]+/g, ' ').trim();
const out = [], counts = {};
for (const lab of Labs.list) {
  const f = (code, msg) => { if ((ALLOW[lab.id] || []).includes(code)) return; out.push({ id: lab.id, code, msg }); counts[code] = (counts[code] || 0) + 1; };
  const sols = (lab.solution || []).map(norm).filter(x => x.length >= 25);
  lab.tasks.forEach((t, i) => {
    const hs = t.hints || [];
    if (hs.length < 2) f('TQ1', 'task ' + (i + 1) + ' has ' + hs.length + ' hint(s); needs at least 2');
    else if (sols.some(s => norm(hs[0]).includes(s))) f('TQ1', 'task ' + (i + 1) + ': hint 1 already contains a full solution command');
    if (sols.some(s => norm(t.title).includes(s))) f('TQ6', 'task ' + (i + 1) + ': the title contains a solution command');
  });
  const d = (global.KL.debrief || {})[lab.id];
  if (!d || d.length !== 4 || d.some(x => !x || String(x).length < 24)) f('TQ2', 'debrief missing or has a part under 24 characters');
  if (!lab.trap && !lab.why && !(lab.constraint && lab.constraint.assert && lab.constraint.assert.length)) f('TQ3', 'no trap, no why and no constraint');
  const comp = global.KL.COMP && global.KL.COMP.of ? global.KL.COMP.of(lab.id) : null;
  if (global.KL.COMP && (!comp || !comp.length)) f('TQ4', 'no competency tag');
  if (global.KL.sources && !(global.KL.sources(lab.id) || []).length) f('TQ4', 'no documentation link');
  if (sols.some(s => norm(lab.story).includes(s))) f('TQ5', 'the story contains a solution command');
  if (String(lab.story || '').length < 60) f('TQ5', 'story under 60 characters');
}
if (list || out.length) out.forEach(o => console.log(o.code, o.id, o.msg));
console.log('\n' + Labs.list.length + ' labs; teaching findings: ' + JSON.stringify(counts));
/* TQ3 (a trap/why/constraint on every lab) is a content gap, so it is a ratchet: it may shrink but never grow. */
const RATCHET = { TQ3: 0 };
const bad = Object.keys(counts).filter(c => counts[c] > (RATCHET[c] || 0));
if (strict && bad.length) { console.error('teach-lint: over limit: ' + bad.join(', ')); process.exit(1); }
