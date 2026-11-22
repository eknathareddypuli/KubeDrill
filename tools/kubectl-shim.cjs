#!/usr/bin/env node
// A `kubectl` stand-in backed by the in-browser simulator. State persists in $KD_STATE (JSON) between calls so the generated
// lab-pack bash scripts (setup.sh / check.sh / solution.sh) can run under REAL bash against the simulator.
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const Sim = require(path.join(root, 'assets/js/sim.js'));
['sim-shell', 'sim-kubectl', 'sim-kubectl2', 'sim-kubectl3', 'sim-faults', 'sim-faults2', 'sim-extras','sim-csr'].forEach(f => require(path.join(root, 'assets/js', f + '.js')));
const st = process.env.KD_STATE; const s = new Sim();
if (st && fs.existsSync(st)) s.load(JSON.parse(fs.readFileSync(st, 'utf8')));
// one-way sync: real files under $KD_HOME appear in the simulator's /home/student, so `kubectl apply -f x.yaml` / `-k dir` see what bash wrote
if (process.env.KD_HOME) { const walk = (d, rel) => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; } es.forEach(e => { const p = path.join(d, e.name), r = rel + '/' + e.name; if (e.isDirectory()) walk(p, r); else if (e.size === undefined || true) { try { const st = fs.statSync(p); if (st.size < 200000) s.fs['/home/student' + r] = fs.readFileSync(p, 'utf8'); } catch (x) { /* skip */ } } }); }; if (s.fs) walk(process.env.KD_HOME, ''); }
const q = a => /^[A-Za-z0-9_@%+=:,.\/-]+$/.test(a) ? a : "'" + a.replace(/'/g, "'\\''") + "'";
const hm = process.env.KD_HOME; const cmd = 'kubectl ' + process.argv.slice(2).map(a => hm ? a.split(hm).join('/home/student') : a).map(q).join(' ');
let stdin = ''; try { if (!process.stdin.isTTY) stdin = fs.readFileSync('/dev/stdin', 'utf8'); } catch (e) { /* no stdin */ }
let r;
if (stdin && /\s-f\s+-(\s|$)|--filename[ =]-/.test(cmd)) r = s.exec(cmd + " <<'KD_STDIN'\n" + stdin.replace(/\n$/, '') + "\nKD_STDIN");
else r = s.exec(cmd);
s.settle(30);
if (st) fs.writeFileSync(st, JSON.stringify(s.dump()));
const w = (fd, t) => { const b = Buffer.from(t || ''); let o = 0; while (o < b.length) { try { o += fs.writeSync(fd, b, o); } catch (e) { if (e.code === 'EAGAIN') continue; if (e.code === 'EPIPE') break; throw e; } } };
w(1, r.stdout); w(2, r.stderr); process.exit(r.code || 0);
