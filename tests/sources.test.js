// Source credits: every lab has at least one official docs link, every link is https, and every skill id used exists.
global.window = global;
const C = require('../assets/js/data/competencies.js'); const Labs = require('../assets/js/labs-engine.js');
require('fs').readdirSync(__dirname + '/../assets/js/data').filter(f => /^labs-sim/.test(f)).forEach(f => require('../assets/js/data/' + f));
require('../assets/js/data/sources.js'); const KL = global.KL;
let bad = 0; const no = m => { console.log('✘', m); bad++; };
for (const l of Labs.list) { if (l.variantOf) continue; const s = KL.sources(l.id); if (!s.length) no('no source for ' + l.id); s.forEach(x => { if (!/^https:\/\//.test(x[1])) no('not https ' + x[1]); }); }
Object.keys(C.meta).forEach(id => { const any = Labs.list.some(l => C.of(l.id).indexOf(id) >= 0); if (any && !Object.values(KL.sourcesAll()).length) no('empty'); });
const withSkills = new Set(); Labs.list.forEach(l => C.of(l.id).forEach(c => withSkills.add(c)));
withSkills.forEach(c => { if (!C.meta[c]) no('unknown skill tag ' + c); });
console.log(bad ? bad + ' source problems' : 'sources OK (' + Labs.list.length + ' labs, ' + Object.keys(KL.sourcesAll()).length + ' unique links)'); process.exit(bad ? 1 : 0);
