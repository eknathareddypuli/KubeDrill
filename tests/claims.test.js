// Claims audit: nothing the site ships may promise an exam result or claim equivalence with the real exam,
// and the independence / "practice, not prediction" statements must be present.
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
function walk(d, out) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (['node_modules', 'dist', 'vendor', 'lab-packs', '.git'].includes(f.name)) continue; const p = path.join(d, f.name); if (f.isDirectory()) walk(p, out); else if (/\.(js|html|md|json|svg)$/.test(f.name) && !/^(sw\.js|package-lock\.json)$/.test(f.name)) out.push(p); } return out; }
const files = walk(root, []).filter(f => !/variants-auto|decoder-data|tests[\\/]/.test(f));
const BANNED = [
  /guarantee[sd]?\s+(you\s+)?(a\s+|to\s+)?(pass|success|certif)/i, /(pass|success)\s+guarantee/i,
  /exam[- ]ready/i, /exam[- ]equivalent/i, /exam[- ]accurate/i, /certification[- ]ready/i,
  /same as the (real |actual )?exam/i, /exactly (like|as) the (real |actual )?exam/i, /identical to the (real |actual )?exam/i,
  /(real|actual|leaked|recent) (cka|ckad|cks)?\s*exam (questions|dumps)/i, /exam dumps?\b/i,
  /(100%|sure|certain)\s+(to\s+)?pass\b/i, /\byou('ll| will) (pass|be certified|get certified)\b/i, /pass(es)? the (cka|ckad|cks)\b/i,
  /(cka|ckad|cks) in \d+ (days|weeks)/i, /ace (the|your) (cka|ckad|cks|exam)/i
];
let bad = 0;
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  txt.split(/(?<=[.!?])\s+|<br>|\n/).forEach(sent => {
    if (/\b(not|never|no|neither|nor|without|differ|n't)\b/i.test(sent)) return;          // negated statements are the disclaimers themselves
    BANNED.forEach(re => { const m = re.exec(sent); if (m) { bad++; console.log('✘ ' + path.relative(root, f) + ': "' + m[0] + '" in: ' + sent.slice(0, 120).replace(/\s+/g, ' ')); } });
  });
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), ex = fs.readFileSync(path.join(root, 'assets/js/exam.js'), 'utf8'), rd = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const need = (c, m) => { if (!c) { bad++; console.log('✘ missing: ' + m); } };
need(/not affiliated with, endorsed by or sponsored by The Linux Foundation, the CNCF/.test(html), 'independence statement in the footer');
need(/practice, not a prediction/i.test(html), 'practice-not-prediction in the footer');
need(/Practice, not prediction/.test(ex) && /not affiliated with or endorsed by the CNCF/.test(ex), 'mock exam disclaimer');
need(/no real exam questions/i.test(html) && /no real exam questions/i.test(ex), 'no-real-questions statement');
need(/independent|not affiliated/i.test(rd), 'README independence note');
console.log(bad ? bad + ' claims problems' : 'claims OK (' + files.length + ' files scanned)'); process.exit(bad ? 1 : 0);
