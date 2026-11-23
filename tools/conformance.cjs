// Conformance suite. Usage:
//   node tools/conformance.cjs            run every lab pack's bash scripts (setup.sh, check.sh, solution.sh) under REAL bash against the
//                                         simulator through tools/kubectl-shim.cjs, and compare with the in-browser JS checker task by task.
//   node tools/conformance.cjs --real     print how to run the same comparison on a real kind cluster (tools/conformance-real.sh)
// What this catches: checker translation bugs (JS assertion vs generated bash), setup.sh that does not reproduce the lab, solutions that
// only pass in the browser. What it cannot catch: simulator behaviour that differs from a real cluster. For that run conformance-real.sh.
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const root = path.join(__dirname, '..');
if (process.argv.includes('--real')) { console.log('Run on a real cluster:\n  kind create cluster --name kubedrill\n  bash tools/conformance-real.sh   # setup → check(expect fail) → solution → check(expect pass) → reset, per lab\nResults go to conformance-real.tsv'); process.exit(0); }
global.window = undefined; const Labs = require(path.join(root, 'assets/js/labs-engine.js'));
const Sim = require(path.join(root, 'assets/js/sim.js')); ['sim-shell', 'sim-kubectl', 'sim-kubectl2', 'sim-kubectl3', 'sim-faults', 'sim-faults2', 'sim-extras','sim-csr','sim-explain'].forEach(f => require(path.join(root, 'assets/js', f + '.js')));
fs.readdirSync(path.join(root, 'assets/js/data')).filter(f => /^labs-sim-.*\.js$/.test(f)).sort().forEach(f => require(path.join(root, 'assets/js/data', f)));
const only = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-conf-')), bin = path.join(tmp, 'bin'); fs.mkdirSync(bin);
fs.writeFileSync(path.join(bin, 'openssl'), '#!/bin/bash\nexec node ' + JSON.stringify(path.join(root, 'tools/openssl-shim.cjs')) + ' "$@"\n', { mode: 0o755 });
fs.writeFileSync(path.join(bin, 'kubectl'), '#!/bin/bash\nexec node ' + JSON.stringify(path.join(root, 'tools/kubectl-shim.cjs')) + ' "$@"\n', { mode: 0o755 });
const env = Object.assign({}, process.env, { PATH: bin + ':' + process.env.PATH, KD_STATE: path.join(tmp, 'state.json'), HOME: path.join(tmp, 'home'), KD_HOME: path.join(tmp, 'home') }); fs.mkdirSync(path.join(tmp, 'home'));
const sh = (script, cwd) => cp.spawnSync('bash', ['-c', script.replace(/bash (\w+\.sh)/, 'bash ' + JSON.stringify(cwd) + '/$1')], { env, cwd: path.join(tmp, 'home'), encoding: 'utf8', timeout: 60000 }); // cwd = $HOME, like the exam shell
let bad = 0, n = 0, skipped = [], needTool = [];
// tasks that check files live on the real disk in this harness (the simulator has its own fs), so only the bash result is meaningful
const fileTask = (lab, i) => (lab.tasks[i].assert || []).some(a => a.t === 'file' || a.t === 'fileRe' || a.t === 'fileNo');
for (const lab of Labs.list) {
  if (only && lab.id.indexOf(only) < 0) continue;
  if (lab.simOnly) { skipped.push(lab.id); continue; }
  const need = ['etcdctl', 'kubeadm', 'crictl', 'trivy', 'kubesec', 'helm'].filter(t => lab.solution.some(l => new RegExp('(^|[;&|] *)' + t + '\\b').test(l)) && cp.spawnSync('bash', ['-c', 'command -v ' + t]).status !== 0);
  if (need.length) { console.log('-', lab.id, '(skipped: needs real ' + need.join(', ') + ' — run tools/conformance-real.sh)'); needTool.push(lab.id); continue; }
  n++;
  const dir = path.join(tmp, lab.id); fs.mkdirSync(dir); const pack = Labs.genPack(lab); Object.keys(pack).forEach(f => fs.writeFileSync(path.join(dir, f), pack[f]));
  try { fs.unlinkSync(env.KD_STATE); } catch (e) { /* none */ }
  const problems = [];
  const su = sh('bash setup.sh', dir); if (su.status !== 0) problems.push('setup.sh exit ' + su.status + ': ' + (su.stderr || '').split('\n')[0]);
  // the pack's own setup must leave the lab broken
  const c1 = sh('bash check.sh', dir); if (c1.status === 0) problems.push('check.sh passes BEFORE the fix (setup.sh did not break it)');
  // JS checker on a sim built from the same state must agree per task
  const sim = new Sim().load(JSON.parse(fs.readFileSync(env.KD_STATE, 'utf8'))); sim.settle(30);
  const js1 = Labs.check(sim, lab), bashMarks1 = (c1.stdout.match(/^  [✔✘]/gm) || []);
  js1.tasks.forEach((t, i) => { if (fileTask(lab, i)) return; const b = bashMarks1[i] && bashMarks1[i].trim() === '✔'; if (bashMarks1[i] && !!t.ok !== !!b) problems.push('task ' + t.id + ' before: JS=' + !!t.ok + ' bash=' + !!b); });
  const so = sh('bash solution.sh', dir); if (/error|not found|invalid/i.test(so.stderr || '') && !so.stdout) problems.push('solution.sh stderr: ' + so.stderr.split('\n')[0]);
  const c2 = sh('bash check.sh', dir); if (c2.status !== 0) problems.push('check.sh FAILS after solution.sh:\n      ' + c2.stdout.split('\n').filter(l => /✘/.test(l)).join('\n      '));
  const sim2 = new Sim().load(JSON.parse(fs.readFileSync(env.KD_STATE, 'utf8'))); sim2.settle(30);
  const js2 = Labs.check(sim2, lab), bm2 = (c2.stdout.match(/^  [✔✘]/gm) || []);
  js2.tasks.forEach((t, i) => { if (fileTask(lab, i)) return; const b = bm2[i] && bm2[i].trim() === '✔'; if (bm2[i] && !!t.ok !== !!b) problems.push('task ' + t.id + ' after: JS=' + !!t.ok + ' bash=' + !!b); });
  if (process.argv.includes('--verbose') && problems.length) { console.log(so.stdout + so.stderr + '\n--- check.sh after:\n' + c2.stdout + c2.stderr); }
  if (problems.length) { bad++; console.log('✘', lab.id); problems.forEach(p => console.log('    ' + p)); } else console.log('✔', lab.id, js1.passed + '/' + js1.total, '→', js2.passed + '/' + js2.total);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n' + (bad ? bad + ' of ' + n + ' lab packs DISAGREE' : 'conformance OK: ' + n + ' lab packs agree (bash checks vs JS checks vs solution)') + (needTool.length ? '\nskipped (tool not installed): ' + needTool.join(', ') : '') + (skipped.length ? '\nskipped (simOnly, no pack): ' + skipped.length : ''));
process.exit(bad ? 1 : 0);
