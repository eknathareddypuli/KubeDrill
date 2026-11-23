#!/usr/bin/env node
// `openssl` stand-in for conformance runs: genrsa / req / x509 behave like the simulator's scripted PKI but operate on REAL files,
// so the generated lab-pack bash (setup.sh / solution.sh) can run against the simulator through tools/kubectl-shim.cjs.
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const Sim = require(path.join(root, 'assets/js/sim.js'));
['sim-shell', 'sim-kubectl', 'sim-kubectl2', 'sim-kubectl3', 'sim-faults', 'sim-faults2', 'sim-extras', 'sim-csr','sim-explain'].forEach(f => require(path.join(root, 'assets/js', f + '.js')));
const s = new Sim(), real = p => path.resolve(process.cwd(), p);
s.readFile = p => { try { return fs.readFileSync(real(p), 'utf8'); } catch (e) { return null; } };
s.writeFile = (p, c) => { fs.writeFileSync(real(p), c); return true; };
const a = process.argv.slice(2);
let stdin = ''; try { if (!process.stdin.isTTY) stdin = fs.readFileSync('/dev/stdin', 'utf8'); } catch (e) { /* none */ }
if (!['genrsa', 'req', 'x509'].includes(a[0])) { // anything else: hand over to the real openssl
  const r = require('child_process').spawnSync('/usr/bin/openssl', a, { input: stdin, encoding: 'utf8' }); process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || ''); process.exit(r.status || 0);
}
const r = s.opensslCsr(a, stdin);
const w = (fd, t) => { const b = Buffer.from(t || ''); let o = 0; while (o < b.length) { try { o += fs.writeSync(fd, b, o); } catch (e) { if (e.code === 'EAGAIN') continue; if (e.code === 'EPIPE') break; throw e; } } };
w(1, r.stdout); w(2, r.stderr); process.exit(r.code || 0);
