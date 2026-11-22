#!/usr/bin/env node
// Checks every source-credit link (assets/js/data/sources.js) with an HTTP request. Needs network access, so run it on your machine or in CI:
//   node tools/check-links.cjs          (exit 1 if any link is dead)
global.window = global;
require('../assets/js/data/competencies.js'); const KL = global.KL; const Labs = require('../assets/js/labs-engine.js');
require('../assets/js/data/sources.js');
const urls = Object.entries(KL.sourcesAll());
let bad = 0, i = 0;
async function one([u, t]) {
  for (const method of ['HEAD', 'GET']) {
    try { const r = await fetch(u, { method, redirect: 'follow', headers: { 'user-agent': 'kubedrill-link-check' }, signal: AbortSignal.timeout(20000) }); if (r.ok) return true; if (method === 'GET') { console.log('✘', r.status, u, '(' + t + ')'); return false; } } catch (e) { if (method === 'GET') { console.log('✘', e.message, u, '(' + t + ')'); return false; } }
  }
}
(async () => { const q = urls.slice(); const run = async () => { while (q.length) { const x = q.shift(); const ok = await one(x); i++; if (!ok) bad++; } }; await Promise.all([run(), run(), run(), run()]); console.log(bad ? bad + ' of ' + i + ' links failed' : 'all ' + i + ' links OK'); process.exit(bad ? 1 : 0); })();
