/* Read & diff page (#reading). No terminal: you read real evidence, or two manifests, and say what is wrong.
   Reading cases show simulator output from a broken lab; diffs show a working and a broken manifest.
   Progress is stored on this device only (localStorage kubedrill:reading). Content lives in data/reading-data.js. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, RC = KL.readingCore, RD = KL.reading, $ = function (id) { return document.getElementById(id); };
  var KEY = 'kubedrill:reading', S = { tab: 'read', open: null, st: null };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function mark(id, firstTry) { var d = load(), o = d[id] || {}; o.done = true; if (firstTry) o.clean = true; o.n = (o.n || 0) + 1; d[id] = o; save(d); }
  function head() {
    return '<div class="section-header"><div class="section-tag">No terminal</div><h2 class="section-title">Read &amp; diff</h2><p class="section-desc">Two skills the exam rewards and a terminal cannot teach: reading evidence quickly, and spotting the one line that differs. Each case is built from real simulator output or a manifest pair that was applied in the simulator, so the clue is really there.</p></div>' +
      '<div class="dr-tabs" role="tablist"><button type="button" role="tab" data-tab="read" class="' + (S.tab === 'read' ? 'on' : '') + '" aria-selected="' + (S.tab === 'read') + '">📄 Reading cases (' + RD.ITEMS.length + ')</button><button type="button" role="tab" data-tab="diff" class="' + (S.tab === 'diff' ? 'on' : '') + '" aria-selected="' + (S.tab === 'diff') + '">🔀 Explain the diff (' + RD.DIFFS.length + ')</button></div>';
  }
  function bindTabs() { document.querySelectorAll('#readRoot .dr-tabs button').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; S.open = null; S.st = null; draw(); }; }); }
  function listHtml() {
    var d = load(), items = S.tab === 'read' ? RD.ITEMS : RD.DIFFS, done = items.filter(function (x) { return d[x.id] && d[x.id].done; }).length, clean = items.filter(function (x) { return d[x.id] && d[x.id].clean; }).length;
    return '<p class="pro-note">' + done + ' of ' + items.length + ' done, ' + clean + ' right first time. Saved on this device only.</p><div class="rd-list">' + items.map(function (x, i) {
      var o = d[x.id] || {}, st = o.clean ? '✓ first try' : o.done ? '● done' : '○ new';
      return '<button type="button" class="rd-card' + (o.done ? ' done' : '') + '" data-id="' + x.id + '"><b>' + (S.tab === 'read' ? 'Case ' : 'Diff ') + (i + 1) + '</b><span>' + (S.tab === 'diff' ? esc(x.title) : 'Real output from a broken cluster') + '</span><em>' + st + '</em></button>';
    }).join('') + '</div>';
  }
  function draw() {
    var root = $('readRoot'); if (!root) return;
    if (!S.open) { root.innerHTML = head() + listHtml(); bindTabs(); root.querySelectorAll('.rd-card').forEach(function (b) { b.onclick = function () { S.open = b.dataset.id; S.st = null; S.tab === 'read' ? openRead() : openDiff(); }; }); return; }
    S.tab === 'read' ? drawRead() : drawDiff();
  }
  function back() { return '<p><button type="button" class="lr-linkbtn" id="rdBack">← All cases</button></p>'; }
  function opts(right, wrong) { return shuffle([{ t: right, ok: true }].concat(wrong.map(function (w) { return { t: w, ok: false }; }))); }
  function optHtml(os) { return '<div class="rd-opts" role="radiogroup">' + os.map(function (o, i) { return '<label class="rd-opt"><input type="radio" name="rdOpt" value="' + i + '"> <span>' + md(o.t) + '</span></label>'; }).join('') + '</div>'; }
  function labLink(id) { var l = Labs.byId[id]; return l ? '<p><a class="btn-secondary" href="#lab/' + l.id + '">Reproduce it yourself: lab ' + esc(l.num) + ' · ' + esc(l.title) + '</a></p>' : ''; }
  function nextHtml() {
    var items = S.tab === 'read' ? RD.ITEMS : RD.DIFFS, i = items.map(function (x) { return x.id; }).indexOf(S.open), n = items[i + 1];
    return '<p>' + (n ? '<button type="button" class="btn-primary" id="rdNext">Next case →</button> ' : '') + '<button type="button" class="btn-secondary" id="rdList">Back to the list</button></p>';
  }
  function wireNav() {
    var b = $('rdBack'), l = $('rdList'), n = $('rdNext'); var items = S.tab === 'read' ? RD.ITEMS : RD.DIFFS;
    if (b) b.onclick = function () { S.open = null; draw(); }; if (l) l.onclick = function () { S.open = null; draw(); };
    if (n) n.onclick = function () { var i = items.map(function (x) { return x.id; }).indexOf(S.open); S.open = items[i + 1].id; S.st = null; S.tab === 'read' ? openRead() : openDiff(); };
  }

  // ── reading cases ──
  function openRead() {
    var it = RD.ITEMS.filter(function (x) { return x.id === S.open; })[0], b = RC.build(it, KL.Sim, Labs);
    S.st = { it: it, b: b, misses: 0, clean: true, found: false, done: false, os: opts(b.right, b.wrong), picked: {} }; draw();
  }
  function drawRead() {
    var st = S.st, b = st.b, root = $('readRoot');
    var ev = '<pre class="rd-ev" id="rdEv" aria-label="Command output">' + b.lines.map(function (l, i) {
      var cls = 'rd-l' + (/^\$ /.test(l.t) ? ' cmd' : '') + (st.found && l.hit ? ' hit' : '');
      return '<span class="' + cls + '" data-i="' + i + '" tabindex="' + (/^\$ /.test(l.t) || st.found ? '-1' : '0') + '">' + esc(l.t || ' ') + '</span>';
    }).join('\n') + '</pre>';
    var h = head() + back() + '<div class="dr-card"><h3>Read the evidence</h3><p class="pro-note">These commands were run on a broken cluster. Do not fix anything: find the cause.</p>' + ev +
      '<p class="rd-step"><b>1. Click the line that gives the cause away.</b></p><div class="dr-msg" id="rdMsg" aria-live="polite">' + (st.found ? '✓ That is the clue (marked in green).' : st.misses ? 'Not that one. ' + (3 - st.misses) + ' tries left.' : '') + '</div>';
    if (st.found || st.misses >= 3) {
      h += '<p class="rd-step"><b>2. What is the root cause?</b></p>' + optHtml(st.os) + '<p><button type="button" class="btn-primary" id="rdCheck"' + (st.done ? ' disabled' : '') + '>Check</button></p><div class="dr-msg" id="rdMsg2" aria-live="polite"></div>';
    }
    if (st.done) {
      var D = KL.debrief[st.it.lab] || [], l = Labs.byId[st.it.lab];
      h += '<div class="lr-debrief"><h4>What it was</h4><p>' + md(D[0] || '') + '</p><h4>The fix</h4><p>' + md(D[1] || '') + '</p><h4>How to spot it</h4><p>' + md(D[2] || '') + '</p>' + (l && l.trap ? '<p><b>The trap:</b> ' + md(l.trap) + '</p>' : '') + '</div>' + labLink(st.it.lab) + nextHtml();
    }
    h += '</div>'; root.innerHTML = h; bindTabs(); wireNav();
    root.querySelectorAll('.rd-l').forEach(function (el) {
      var i = +el.dataset.i, line = b.lines[i]; if (/^\$ /.test(line.t) || st.found || st.misses >= 3) return;
      var go = function () {
        if (!line.t.trim()) return; if (line.hit) { st.found = true; if (st.misses) st.clean = false; draw(); return; }
        st.misses++; st.clean = false; if (st.misses >= 3) { st.found = true; } draw();
      };
      el.onclick = go; el.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    });
    var chk = $('rdCheck'); if (chk) chk.onclick = function () {
      var r = root.querySelector('input[name=rdOpt]:checked'); if (!r) { $('rdMsg2').textContent = 'Pick one answer first.'; return; }
      var o = st.os[+r.value]; if (o.ok) { st.done = true; mark(st.it.id, st.clean); draw(); } else { st.clean = false; st.picked[+r.value] = 1; $('rdMsg2').textContent = 'Not quite. Re-read the evidence: which statement does it actually support?'; r.parentNode.classList.add('wrong'); r.disabled = true; }
    };
  }

  // ── explain the diff ──
  function openDiff() {
    var d = RD.DIFFS.filter(function (x) { return x.id === S.open; })[0];
    S.st = { d: d, bad: RC.badLines(d), misses: 0, clean: true, found: false, done: false, os: opts(d.why.right, d.why.wrong), out: null }; draw();
  }
  function pane(txt, title, cls, st, clickable) {
    var ls = txt.replace(/\n$/, '').split('\n');
    return '<div class="rd-pane ' + cls + '"><h5>' + title + '</h5><pre>' + ls.map(function (l, i) {
      var n = i + 1, isBad = clickable && (st.found || st.misses >= 3) && st.bad.indexOf(n) >= 0;
      return '<span class="rd-l' + (isBad ? ' hit' : '') + '" data-n="' + n + '"' + (clickable && !st.found && st.misses < 3 ? ' tabindex="0"' : '') + '><i>' + n + '</i>' + esc(l || ' ') + '</span>';
    }).join('\n') + '</pre></div>';
  }
  function drawDiff() {
    var st = S.st, d = st.d, root = $('readRoot'), live = !st.found && st.misses < 3;
    var h = head() + back() + '<div class="dr-card"><h3>' + esc(d.title) + '</h3><div class="rd-panes">' + pane(d.a, 'A · works', 'ok', st, false) + pane(d.b, 'B · broken', 'broken', st, true) + '</div>' +
      '<p class="rd-step"><b>1. Click the line in B that breaks it.</b></p><div class="dr-msg" id="rdMsg" aria-live="polite">' + (st.found ? (st.misses < 3 ? '✓ Found it.' : 'The breaking line is marked.') : st.misses ? 'Not that line, it is the same in A or harmless. ' + (3 - st.misses) + ' tries left.' : '') + '</div>';
    if (!live) h += '<p class="rd-step"><b>2. Why does it break?</b></p>' + optHtml(st.os) + '<p><button type="button" class="btn-primary" id="rdCheck"' + (st.done ? ' disabled' : '') + '>Check</button></p><div class="dr-msg" id="rdMsg2" aria-live="polite"></div>';
    if (st.done) {
      var A = RC.runDiff(d, 'a', KL.Sim), B = RC.runDiff(d, 'b', KL.Sim);
      h += '<div class="lr-debrief"><h4>Why</h4><p>' + md(d.why.right) + '</p><h4>What you would see</h4>' + (B ? '<pre class="rd-out">' + esc(B) + '</pre><p class="pro-note">Run in the simulator. The working version gives:</p><pre class="rd-out">' + esc(A) + '</pre>' : '<p>' + md(d.symptom) + '</p><p class="pro-note">A real API server rejects this. The simulator is more forgiving here, so this case is not reproduced in it.</p>') + '</div>' + labLink(d.lab) + nextHtml();
    }
    h += '</div>'; root.innerHTML = h; bindTabs(); wireNav();
    if (live) root.querySelectorAll('.rd-pane.broken .rd-l').forEach(function (el) {
      var go = function () { var n = +el.dataset.n; if (st.bad.indexOf(n) >= 0) { st.found = true; if (st.misses) st.clean = false; } else { st.misses++; st.clean = false; } draw(); };
      el.onclick = go; el.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    });
    var chk = $('rdCheck'); if (chk) chk.onclick = function () {
      var r = root.querySelector('input[name=rdOpt]:checked'); if (!r) { $('rdMsg2').textContent = 'Pick one answer first.'; return; }
      var o = st.os[+r.value]; if (o.ok) { st.done = true; mark(st.d.id, st.clean); draw(); } else { st.clean = false; $('rdMsg2').textContent = 'Not quite. Compare the two sides again: what does the broken line promise that the system cannot deliver?'; r.parentNode.classList.add('wrong'); r.disabled = true; }
    };
  }
  KL.route('reading', function () { S.open = null; draw(); });
})();
