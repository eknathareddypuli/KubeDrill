#!/usr/bin/env node
/* Generates assets/js/data/variants-auto.js: two extra variants for every lab that has none by hand.
   A variant renames the namespace and the objects the lab declares (token-bounded, applied to story, setup, tasks, hints, solution)
   so the same fault shows up with different names. Every candidate is then run through tests/labs.test.js (fails before the fix,
   passes after the reference solution, survives a save/restore) and the failing ones are dropped. Usage: node tools/gen-variants.cjs */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), OUT = path.join(root, 'assets/js/data/variants-auto.js');
const yaml = require('js-yaml');
function load() {
  Object.keys(require.cache).forEach(k => { if (k.startsWith(root)) delete require.cache[k]; });
  global.KL = { autoVariants: {} };
  require(path.join(root, 'assets/js/sim.js')); ['sim-shell','sim-kubectl','sim-kubectl2','sim-kubectl3','sim-faults','sim-faults2','sim-extras','sim-csr','sim-explain'].forEach(f => require(path.join(root, 'assets/js', f + '.js')));
  const Labs = require(path.join(root, 'assets/js/labs-engine.js')); global.KL.Labs = Labs;
  for (const f of fs.readdirSync(path.join(root, 'assets/js/data')).filter(x => /^labs-sim-.*\.js$/.test(x)).sort()) require(path.join(root, 'assets/js/data', f));
  require(path.join(root, 'assets/js/data/hint-ladder.js')); require(path.join(root, 'assets/js/data/lab-meta.js'));
  return Labs;
}
const NS_POOL = ['billing', 'ledger', 'orders', 'retail', 'media', 'search', 'inventory', 'tickets', 'catalog', 'alerts', 'booking', 'reports', 'support', 'fleet', 'studio', 'harbor', 'summit', 'meridian', 'atlas', 'orbit'];
const WL_POOL = ['frontend', 'gateway', 'storefront', 'portal', 'checkout', 'reporter', 'scheduler', 'indexer', 'renderer', 'notifier', 'ingestor', 'exporter', 'resolver', 'mailer', 'tracker', 'billing-api', 'catalog-api', 'sync', 'broker', 'archiver'];
const STOP = new Set('app name kind env tier version role default kube-system kube-public nginx busybox httpd redis test main config data spec metadata labels selector template container containers image pod pods service services deployment deploy node nodes namespace cluster user users group admin latest true false none web-app c'.split(' '));
function h(s) { let x = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x; }
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function rule(tok, to) { return ['~(^|[^A-Za-z0-9_-])' + esc(tok) + '(?![A-Za-z0-9_-])', '$1' + to]; }
function candidates(lab) {
  const setup = (lab.setup || []).join('\n'), names = [], seen = new Set();
  const add = n => { if (typeof n === 'string' && /^[a-z][a-z0-9-]{2,}$/.test(n) && !STOP.has(n) && !seen.has(n)) { seen.add(n); names.push(n); } };
  if (lab.ns && lab.ns !== 'default') add(lab.ns);
  const KINDS = /^(Deployment|StatefulSet|DaemonSet|Service|Pod|ConfigMap|Secret|Job|CronJob|PersistentVolumeClaim|ServiceAccount)$/;
  (lab.setup || []).forEach(d => { try { yaml.loadAll(d, o => { if (o && o.kind && KINDS.test(o.kind) && o.metadata && o.metadata.name && o.metadata.namespace !== 'kd-noise') add(o.metadata.name); }); } catch (e) { /* skip */ } });
  const whole = JSON.stringify([lab.story, lab.setup, lab.setupCmds, lab.files, lab.tasks, lab.solution, lab.stage2, lab.constraint, lab.caution]);
  return names.filter(n => {
    if (new RegExp('(^|\\n)\\s*(- )?' + esc(n) + ':(\\s|$)').test(setup)) return false;        // used as a YAML key
    if (!lab.setup && !lab.setupCmds) return false;
    if (new RegExp('(image|command|args)[^\\n]{0,60}' + esc(n)).test(setup)) return false;       // part of an image/command
    if (/^(worker|control|node|master|kind|minikube)/.test(n)) return false;
    return true;
  }).slice(0, 4).map(n => ({ n, all: whole }));
}
function build(Labs, drop) {
  const out = {}; let total = 0;
  for (const lab of Labs.list) {
    if (lab.variantOf || (global.KL.meta && 0)) continue;
    const m = (Labs.meta || {})[lab.id]; if (m && m.variants) continue;
    const c = candidates(lab); if (!c.length) continue;
    const whole = c[0].all, vs = [];
    const used = n => new RegExp('(^|[^A-Za-z0-9_-])' + esc(n) + '(?![A-Za-z0-9_-])').test(whole);
    for (let v = 0; v < 2; v++) {
      const sub = [], taken = new Set(); let ok = true;
      c.forEach((cd, i) => {
        if (v === 0 && i > 1) return;                       // variant 2: namespace + first object
        const pool = (i === 0 && lab.ns === cd.n) ? NS_POOL : WL_POOL;
        let to = null;
        for (let k = 0; k < pool.length; k++) { const cand = pool[(h(lab.id + ':' + v + ':' + i) + k) % pool.length]; if (!used(cand) && !taken.has(cand) && cand !== cd.n) { to = cand; break; } }
        if (!to) { ok = false; return; } taken.add(to); sub.push(rule(cd.n, to));
      });
      if (ok && sub.length) vs.push({ sub });
    }
    if (vs.length) { const keep = vs.filter((_, i) => !(drop[lab.id] || []).includes(i)); if (keep.length) { out[lab.id] = keep; total += keep.length; } }
  }
  return { out, total };
}
function write(out) { fs.writeFileSync(OUT, '/* GENERATED by tools/gen-variants.cjs: do not edit. Each variant is test-validated (fails before, passes after the reference solution). */\n(function (root) {\n  var KL = root.KL = root.KL || {};\n  KL.autoVariants = ' + JSON.stringify(out, null, 0).replace(/\},"/g, '},\n    "') + ';\n})(typeof window !== \'undefined\' ? window : globalThis);\n'); }
const drop = {}; let Labs = load();
for (let round = 0; round < 4; round++) {
  const { out, total } = build(Labs, drop); write(out);
  console.log('round', round, 'candidates', total);
  const r = cp.spawnSync('node', ['tests/labs.test.js'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, env: process.env });
  const bad = new Set(); (r.stdout.match(/✘ [^\s]+~v\d+/g) || []).forEach(x => bad.add(x.slice(2)));
  (r.stdout.match(/(persist round-trip|stage2 flag lost in persist) [^\s]+~v\d+/g) || []).forEach(x => bad.add(x.split(' ').pop()));
  if (!bad.size) { console.log('all auto variants valid'); break; }
  bad.forEach(id => { const m = id.match(/^(.*)~v(\d+)$/); if (!m) return; const arr = (drop[m[1]] = drop[m[1]] || []); const idx = +m[2] - 2; /* index within current list */ const lst = out[m[1]] || []; const orig = lst[idx]; if (orig) { const all = build(Labs, {}).out[m[1]] || []; const oi = all.findIndex(x => JSON.stringify(x) === JSON.stringify(orig)); if (oi >= 0 && !arr.includes(oi)) arr.push(oi); } });
  console.log('dropped', [...bad].length, 'failing variants');
}
