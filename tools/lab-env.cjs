#!/usr/bin/env node
/* Loads the labs and metadata in index.html order and exports Labs. Shared by lint tools. */
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
module.exports = Labs;
