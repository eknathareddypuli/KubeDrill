/* Drills page (#drills): command-speed drills and documentation-lookup races. Outcome-checked in the simulator (any correct command counts).
   Times are saved on this device only. A drill measures how fast you can do a task you already understand: it does not teach the concept. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, DR = KL.drills, $ = function (id) { return document.getElementById(id); };
  var KEY = 'kubedrill:drills', S = { tab: 'cmd', cat: 'All', n: 5, run: null, result: null }, timer = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function stopTimer() { clearInterval(timer); timer = null; }

  // ── outcome check for one drill ──
  function mkSim(d) {
    var sim = new KL.Sim(); Labs.setup(sim, { id: 'drill:' + d.id, ns: DR.NS, setupCmds: (d.setup || []).map(function (c) { return c + ' -n ' + DR.NS; }) });
    (d.setupCmds || []).forEach(function (c) { sim.exec(c); });
    sim.exec('export do="--dry-run=client -o yaml" now="--force --grace-period 0"'); sim.settle(15); sim.ctxNs = DR.NS; return sim;
  }
  function verdict(sim, d, lastOut) {
    if (d.assert) { var lab = { id: 'drill', ns: DR.NS, tasks: [{ id: '1', title: 't', assert: d.assert }], solution: [] }; var r = Labs._baseCheck ? Labs._baseCheck(sim, lab, {}) : Labs.check(sim, lab, { noExtras: true }); if (!r.ok) return false; }
    if (d.out) { var re = d.out.re; if (d.out.dyn) re = '^' + sim.exec(d.out.dyn).stdout.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'; if (!new RegExp(re, 'm').test(String(lastOut || '').trim())) return false; }
    return true;
  }
  function pctl(a, p) { if (!a.length) return 0; a = a.slice().sort(function (x, y) { return x - y; }); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; }

  // ── command drills ──
  function startCmd() {
    var pool = DR.DRILLS.filter(function (d) { return S.cat === 'All' || d.cat === S.cat; });
    S.run = { kind: 'cmd', items: shuffle(pool).slice(0, S.n), i: 0, res: [] }; S.result = null; nextCmd();
  }
  function nextCmd() {
    var r = S.run; stopTimer();
    if (r.i >= r.items.length) { finish(); return; }
    var d = r.items[r.i]; r.cur = { d: d, sim: mkSim(d), t0: Date.now(), cmds: [], limit: Math.max(45, d.par * 4), last: '', out: '' }; drawCmd();
    timer = setInterval(tick, 250);
  }
  function tick() {
    var r = S.run; if (!r || !r.cur) return stopTimer(); var el = $('drT'), c = r.cur, t = (Date.now() - c.t0) / 1000; if (!el) return;
    el.textContent = fmt(t) + ' / ' + fmt(c.limit); el.className = 'dr-time' + (t > c.d.par * 2 ? ' slow' : '') + (t > c.limit ? ' over' : '');
    if (t >= c.limit) endCmd('timeout');
  }
  function drawCmd() {
    var root = $('drillRoot'), r = S.run, c = r.cur, d = c.d;
    root.innerHTML = head() + '<div class="dr-card"><div class="dr-top"><span>Drill ' + (r.i + 1) + ' of ' + r.items.length + ' · ' + esc(d.cat) + ' · par ' + d.par + 's</span><span class="dr-time" id="drT">0:00</span></div>' +
      '<p class="dr-q">' + md(d.q) + '</p><p class="pro-note">Namespace <code>' + DR.NS + '</code> is your current namespace. <code>k</code>, <code>$do</code> and <code>$now</code> work. Press Enter to run. Any command that gets the result right counts.</p>' +
      '<input class="dr-in" id="drIn" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command" placeholder="k ..."><div class="dr-msg" id="drMsg" aria-live="polite"></div><pre class="dr-out" id="drOut"></pre>' +
      '<div><button class="btn-secondary" id="drSkip" type="button">Skip</button> <button class="lr-linkbtn" id="drQuit" type="button">Stop round</button></div></div>';
    var inp = $('drIn'); inp.focus();
    inp.onkeydown = function (e) { if (e.key !== 'Enter') return; var v = inp.value.trim(); if (!v) return; inp.value = ''; runCmd(v); };
    $('drSkip').onclick = function () { endCmd('skip'); }; $('drQuit').onclick = function () { stopTimer(); finish(); };
    bindTabs();
  }
  function runCmd(line) {
    var r = S.run, c = r.cur; c.cmds.push(line); var res = c.sim.exec(line); c.sim.settle(15);
    var text = (res.stdout || '') + (res.stderr || ''); c.last = text; $('drOut').textContent = '$ ' + line + '\n' + text;
    if (verdict(c.sim, c.d, text)) { $('drMsg').className = 'dr-msg good'; $('drMsg').textContent = '✓ Done'; endCmd('ok'); }
    else { $('drMsg').className = 'dr-msg bad'; $('drMsg').textContent = res.code ? 'That command failed. Read the error and try again.' : 'Not there yet: the task is not complete.'; }
  }
  function endCmd(how) {
    var r = S.run, c = r.cur; if (!c || c.done) return; c.done = true; stopTimer();
    var t = (Date.now() - c.t0) / 1000; r.res.push({ d: c.d, how: how, t: t, cmds: c.cmds.slice() });
    var store = load(), rec = store[c.d.id] = store[c.d.id] || { runs: 0, ok: 0 }; rec.runs++; if (how === 'ok') { rec.ok++; rec.best = rec.best ? Math.min(rec.best, Math.round(t)) : Math.round(t); } rec.last = Math.round(t); save(store);
    r.i++; setTimeout(nextCmd, how === 'ok' ? 700 : 150);
  }

  // ── doc races ──
  function startRace() { S.run = { kind: 'race', items: shuffle(DR.RACES).slice(0, S.n), i: 0, res: [] }; S.result = null; nextRace(); }
  function nextRace() {
    var r = S.run; stopTimer(); if (r.i >= r.items.length) { finish(); return; }
    r.cur = { q: r.items[r.i], sim: new KL.Sim(), t0: Date.now(), looks: 0, limit: 90, wrong: 0 }; drawRace(); timer = setInterval(tickRace, 250);
  }
  function tickRace() { var c = S.run && S.run.cur; if (!c) return stopTimer(); var t = (Date.now() - c.t0) / 1000, el = $('drT'); if (el) { el.textContent = fmt(t) + ' / ' + fmt(c.limit); el.className = 'dr-time' + (t > 60 ? ' slow' : '') + (t > c.limit ? ' over' : ''); } if (t >= c.limit) endRace('timeout'); }
  function drawRace() {
    var root = $('drillRoot'), r = S.run, c = r.cur;
    root.innerHTML = head() + '<div class="dr-card"><div class="dr-top"><span>Question ' + (r.i + 1) + ' of ' + r.items.length + '</span><span class="dr-time" id="drT">0:00</span></div>' +
      '<p class="dr-q">' + md(c.q.q) + '</p><p class="pro-note">Like the exam: the docs are your only help. Here only <code>kubectl explain …</code> and <code>kubectl api-resources</code> are available (pipe to <code>grep</code> if you like). The answer is a field name, spelled exactly (the API is case-sensitive).</p>' +
      '<label class="pro-note" for="drLook">Look it up</label><input class="dr-in" id="drLook" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="k explain pod.spec | grep -i ..."><pre class="dr-out" id="drOut"></pre>' +
      '<label class="pro-note" for="drAns">Your answer</label><input class="dr-in" id="drAns" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="fieldName"><div class="dr-msg" id="drMsg" aria-live="polite"></div>' +
      '<div><button class="btn-secondary" id="drSkip" type="button">Skip</button> <button class="lr-linkbtn" id="drQuit" type="button">Stop round</button></div></div>';
    $('drLook').focus();
    $('drLook').onkeydown = function (e) { if (e.key !== 'Enter') return; var v = this.value.trim(); if (!v) return; this.value = ''; lookup(v); };
    $('drAns').onkeydown = function (e) { if (e.key !== 'Enter') return; answer(this.value.trim()); };
    $('drSkip').onclick = function () { endRace('skip'); }; $('drQuit').onclick = function () { stopTimer(); finish(); };
    bindTabs();
  }
  function lookup(line) {
    var c = S.run.cur, norm = line.replace(/^k\s/, 'kubectl ');
    if (!/^kubectl\s+(explain|api-resources)\b/.test(norm) || /[;&><]|\$\(|`/.test(norm.replace(/2>&1/g, ''))) { $('drOut').textContent = 'In a doc race only kubectl explain and kubectl api-resources are available (you may pipe to grep or head).'; return; }
    c.looks++; var r = c.sim.exec(norm); $('drOut').textContent = '$ ' + line + '\n' + ((r.stdout || '') + (r.stderr || '')).slice(0, 4000);
  }
  function answer(v) {
    var c = S.run.cur; if (!v) return;
    if (c.q.accept.indexOf(v) >= 0) { $('drMsg').className = 'dr-msg good'; $('drMsg').textContent = '✓ Correct'; endRace('ok'); }
    else { c.wrong++; $('drMsg').className = 'dr-msg bad'; $('drMsg').textContent = c.wrong >= 3 ? 'Not yet. Hint: look under ' + c.q.path + ' (kubectl explain ' + c.q.path + ').' : (v.toLowerCase() === c.q.accept[0].toLowerCase() ? 'Right word, wrong spelling: field names are case-sensitive.' : 'Not that one. Keep looking.'); }
  }
  function endRace(how) {
    var r = S.run, c = r.cur; if (!c || c.done) return; c.done = true; stopTimer(); var t = (Date.now() - c.t0) / 1000;
    r.res.push({ q: c.q, how: how, t: t, looks: c.looks, wrong: c.wrong });
    var store = load(), k = 'race:' + c.q.id, rec = store[k] = store[k] || { runs: 0, ok: 0 }; rec.runs++; if (how === 'ok') { rec.ok++; rec.best = rec.best ? Math.min(rec.best, Math.round(t)) : Math.round(t); } save(store);
    r.i++; setTimeout(nextRace, how === 'ok' ? 700 : 150);
  }

  // ── result ──
  function finish() {
    stopTimer(); var r = S.run; S.result = r; S.run = null; draw();
  }
  function resultHtml(r) {
    if (!r.res.length) return '<div class="dr-card"><p>No drills finished. Start a round when you are ready.</p></div>';
    if (r.kind === 'cmd') {
      var done = r.res.filter(function (x) { return x.how === 'ok'; }), ts = done.map(function (x) { return x.t; }), byCat = {};
      r.res.forEach(function (x) { var c = byCat[x.d.cat] = byCat[x.d.cat] || { ok: 0, n: 0, over: 0 }; c.n++; if (x.how === 'ok') { c.ok++; if (x.t > x.d.par * 2) c.over++; } });
      var weak = Object.keys(byCat).map(function (k) { return { k: k, miss: byCat[k].n - byCat[k].ok + byCat[k].over, n: byCat[k].n }; }).sort(function (a, b) { return b.miss - a.miss; })[0];
      var h = '<div class="dr-card"><h3>Round finished: ' + done.length + ' of ' + r.res.length + ' done' + (ts.length ? ' · median ' + Math.round(pctl(ts, 0.5)) + 's' : '') + '</h3>' +
        '<table class="dr-tab"><thead><tr><th></th><th>Drill</th><th>Time</th><th>Par</th><th>Your commands</th><th>Model answer</th></tr></thead><tbody>' + r.res.map(function (x) {
          var ok = x.how === 'ok', best = [].concat(x.d.best).join(' ; '), mine = x.cmds.join(' ; ') || '(none)', longer = ok && mine.length > best.length * 1.7;
          return '<tr><td class="' + (ok ? 'p' : 'f') + '">' + (ok ? '✓' : (x.how === 'skip' ? '↷' : '✗')) + '</td><td>' + md(x.d.q) + '<br><em>' + md(x.d.tip) + '</em></td><td class="' + (ok && x.t <= x.d.par * 2 ? 'p' : 'f') + '">' + Math.round(x.t) + 's</td><td>' + x.d.par + 's</td><td><code>' + esc(mine) + '</code>' + (longer ? '<br><em>A shorter route exists.</em>' : '') + '</td><td><code>' + esc(best) + '</code></td></tr>';
        }).join('') + '</tbody></table>' + (weak && weak.miss ? '<p class="pro-note"><b>Practise next:</b> ' + weak.k + ' (' + weak.miss + ' missed or slow). Run the round again with that category selected.</p>' : '<p class="pro-note">Clean round. Raise the difficulty by trying the Debug category, or shorten your commands with <code>k</code> and <code>$do</code>.</p>') +
        '<p class="pro-note">Par is a comfortable time for someone who already knows the command. Drills build speed on tasks you understand; they do not replace the labs that teach the why.</p></div>';
      return h;
    }
    var okc = r.res.filter(function (x) { return x.how === 'ok'; });
    return '<div class="dr-card"><h3>Race finished: ' + okc.length + ' of ' + r.res.length + ' found' + (okc.length ? ' · median ' + Math.round(pctl(okc.map(function (x) { return x.t; }), 0.5)) + 's' : '') + '</h3>' +
      '<table class="dr-tab"><thead><tr><th></th><th>Question</th><th>Time</th><th>Lookups</th><th>Answer</th><th>Where it lives</th></tr></thead><tbody>' + r.res.map(function (x) {
        return '<tr><td class="' + (x.how === 'ok' ? 'p' : 'f') + '">' + (x.how === 'ok' ? '✓' : '✗') + '</td><td>' + md(x.q.q) + '</td><td>' + Math.round(x.t) + 's</td><td>' + x.looks + '</td><td><code>' + esc(x.q.accept[0]) + '</code></td><td><code>kubectl explain ' + esc(x.q.path) + '</code></td></tr>';
      }).join('') + '</tbody></table><p class="pro-note">Faster habit: <code>k explain pod.spec --recursive | grep -i grace</code> finds a field from a word without reading the whole tree.</p></div>';
  }
  function bests() {
    var st = load(), keys = Object.keys(st); if (!keys.length) return '';
    var ok = keys.filter(function (k) { return st[k].ok; }).length;
    return '<p class="pro-note">Saved on this device: ' + ok + ' of ' + (DR.DRILLS.length + DR.RACES.length) + ' drills and races completed at least once.</p>';
  }
  function head() { return '<div class="section-header"><div class="section-tag">Speed</div><h2 class="section-title">Drills</h2><p class="section-desc">Short timed tasks for the habits the exam rewards: imperative commands and finding fields fast. Checked on the outcome in the simulator, so any correct command counts.</p></div><div class="dr-tabs" role="tablist"><button type="button" role="tab" data-tab="cmd" class="' + (S.tab === 'cmd' ? 'on' : '') + '" aria-selected="' + (S.tab === 'cmd') + '">⚡ Command drills</button><button type="button" role="tab" data-tab="race" class="' + (S.tab === 'race' ? 'on' : '') + '" aria-selected="' + (S.tab === 'race') + '">📖 Doc races</button></div>'; }
  function bindTabs() { document.querySelectorAll('.dr-tabs button').forEach(function (b) { b.onclick = function () { if (S.run && !confirm('Stop this round?')) return; stopTimer(); S.run = null; S.result = null; S.tab = b.dataset.tab; draw(); }; }); }
  function draw() {
    var root = $('drillRoot'); if (!root) return;
    if (S.run) { return S.run.kind === 'cmd' ? drawCmd() : drawRace(); }
    var setup;
    if (S.tab === 'cmd') setup = '<div class="dr-card"><h3>Command drills</h3><p class="pro-note">' + DR.DRILLS.length + ' tasks. Each has a time limit of four times its par. Skipping or timing out shows the model answer.</p><label class="pro-note">Category <select id="drCat" class="ver-bar-sel">' + ['All'].concat(DR.CATS).map(function (c) { return '<option' + (S.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label> <label class="pro-note">Drills per round <select id="drN">' + [3, 5, 8, 12].map(function (n) { return '<option' + (S.n === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><p><button class="btn-primary" id="drGo" type="button">Start round</button></p></div>';
    else setup = '<div class="dr-card"><h3>Documentation-lookup races</h3><p class="pro-note">' + DR.RACES.length + ' questions of the form “which field does X?”. You have 90 seconds each and only <code>kubectl explain</code> to look it up, as in the exam where the docs are the only help.</p><label class="pro-note">Questions per round <select id="drN">' + [3, 5, 8, 12].map(function (n) { return '<option' + (S.n === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><p><button class="btn-primary" id="drGo" type="button">Start race</button></p></div>';
    root.innerHTML = head() + setup + (S.result && S.result.kind === (S.tab === 'cmd' ? 'cmd' : 'race') ? resultHtml(S.result) : '') + bests();
    bindTabs(); var go = $('drGo'); if (go) go.onclick = function () { S.n = parseInt($('drN').value, 10); if ($('drCat')) S.cat = $('drCat').value; S.tab === 'cmd' ? startCmd() : startRace(); };
  }
  window.addEventListener('hashchange', function () { if (!/^#drills/.test(location.hash) && S.run) { stopTimer(); S.run = null; } });
  KL.route('drills', function () { if (!S.run) draw(); else draw(); });
  KL.drillsApi = { state: S, verdict: verdict, mkSim: mkSim };
})();
