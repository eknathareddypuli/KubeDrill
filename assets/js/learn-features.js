/* Learning features layered on the lab runner (no changes to lab specs):
   1. Worked examples   lab.worked = {steps:[{say,cmd}]}: watch the expert's commands run step by step, then do it yourself.
   2. Fading hints      hints are labelled Nudge → Approach → Answer; labs that needed the Answer are re-offered later.
   3. Predict, then run optional toggle: write what you expect from a change command, run it, then grade your own guess.
   4. Compare solutions after a pass: your changing commands next to the reference solution.
   All state is local (localStorage). */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function rd(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function baseId(lab) { return lab.variantOf || lab.id; }
  var FADE = 'kubedrill:fade', PRED = 'kubedrill:predrun';

  var st = document.createElement('style');
  st.textContent = '.lf-worked,.lf-cmp,.lf-fade{border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin:10px 0;background:var(--bg2,rgba(255,255,255,.03));font-size:13px}' +
    '.lf-worked h4,.lf-cmp h4,.lf-fade h4{margin:0 0 6px;font-size:13px}.lf-step{padding:4px 0;color:var(--text2)}.lf-step.done{opacity:.7}.lf-step code,.lf-cmp code{font-family:var(--mono);font-size:12px}' +
    '.lf-bar{height:4px;background:var(--border);border-radius:3px;margin:6px 0}.lf-bar i{display:block;height:4px;background:var(--green);border-radius:3px}' +
    '.lf-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:700px){.lf-cols{grid-template-columns:1fr}}.lf-cols pre{margin:4px 0 0;white-space:pre-wrap;font-size:12px}' +
    '.lf-pred{border:1px solid var(--accent2,#6ea8ff);border-radius:8px;padding:8px 10px;margin:6px 0;font-size:12.5px}.lf-pred textarea{width:100%;min-height:42px;box-sizing:border-box;margin:6px 0}.lf-lvl{font-style:normal;font-weight:600}' +
    '.lf-toggle{font-size:12px;margin-left:8px;cursor:pointer}';
  document.head.appendChild(st);

  // ── 2. fading hints ──
  var LEVEL = ['Nudge', 'Approach', 'Answer'];
  function levelOf(i, n) { return n <= 1 ? 2 : (i === 0 ? 0 : (i === n - 1 ? 2 : 1)); }
  KL.fade = {
    data: function () { return rd(FADE, {}); },
    list: function () { var d = KL.fade.data(); return Object.keys(d).filter(function (id) { return d[id].revisit && Labs.byId[id]; }).map(function (id) { return Labs.byId[id]; }); }
  };
  function decorateHints() {
    var host = $('lrTasks'); if (!host) return;
    var r = KL.runner && KL.runner.cur(); if (!r) return;
    var ts = Labs.allTasks(r.sim, r.lab);
    host.querySelectorAll('.lr-task').forEach(function (li) {
      var t = ts.filter(function (x) { return x.id === li.dataset.id; })[0]; if (!t) return;
      li.querySelectorAll('.lr-hint').forEach(function (h, i) { var i0 = h.querySelector('i'); if (i0 && !i0.dataset.lf) { var lv = levelOf(i, t.hints.length); i0.dataset.lf = '1'; i0.className = 'lf-lvl'; i0.textContent = 'Level ' + (lv + 1) + ' · ' + LEVEL[lv]; } });
      var b = li.querySelector('.lr-hint-btn'); if (b && !b.dataset.lf) { b.dataset.lf = '1'; var shown = li.querySelectorAll('.lr-hint').length, nx = levelOf(shown, t.hints.length); b.title = 'Next is level ' + (nx + 1) + ' of 3: ' + LEVEL[nx] + (nx === 2 ? ' (gives the answer; the lab will be offered again for revisit)' : ''); }
    });
  }
  window.addEventListener('kl:hint', function (e) {
    var r = e.detail.run, lab = Labs.byId[baseId(r.lab)] || r.lab, ts = Labs.allTasks(r.sim, r.lab), t = ts.filter(function (x) { return x.id === e.detail.task; })[0]; if (!t) return;
    var idx = (r.hintIdx[e.detail.task] || 1) - 1, lv = levelOf(idx, t.hints.length), d = KL.fade.data(), o = d[lab.id] = d[lab.id] || { max: 0 };
    if (lv > o.max) o.max = lv; wr(FADE, d); setTimeout(decorateHints, 0);
  });
  window.addEventListener('kl:labdone', function (e) {
    var lab = e.detail && e.detail.lab; if (!lab || e.detail.mode !== 'learn') return; var id = baseId(lab), d = KL.fade.data(), o = d[id];
    if (o) { if (o.max >= 2) o.revisit = true; else if (o.revisit) delete o.revisit; }
    var r = KL.runner.cur(); var used = r && Object.keys(r.hintIdx).some(function (k) { return r.hintIdx[k]; });
    if (!used && d[id]) { delete d[id].revisit; d[id].max = 0; }   // a clean pass clears it
    wr(FADE, d);
  });
  function revisitCard() {
    var old = $('lfRevisit'); if (old) old.remove(); var l = KL.fade.list(); if (!l.length) return; var anchor = $('dailyCard'); if (!anchor) return;
    var el = document.createElement('div'); el.id = 'lfRevisit'; el.className = 'lf-fade';
    el.innerHTML = '<h4>🔁 Revisit: you needed the full answer here</h4><div>Try these again with no hints. A clean pass clears them.</div>' + l.slice(0, 6).map(function (x) { return '<div class="lf-step"><a href="#lab/' + esc(x.id) + '">' + esc(x.num + ' · ' + x.title) + '</a></div>'; }).join('');
    anchor.parentNode.insertBefore(el, anchor.nextSibling);
  }
  window.addEventListener('kl:page', function (e) { if (e.detail && e.detail.name === 'labs') setTimeout(revisitCard, 80); });

  // ── 1. worked example ──
  var WK = {};
  function workedPanel(r) {
    var old = $('lfWorked'); if (old) old.remove(); var w = r.lab.worked; if (!w || r.mode !== 'learn' || !$('lrTasks')) return;
    var el = document.createElement('div'); el.id = 'lfWorked'; el.className = 'lf-worked'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Worked example');
    function draw() {
      var n = WK[r.lab.id] || 0;
      el.innerHTML = '<h4>👀 Worked example <span style="font-weight:400;color:var(--text3)">(' + n + ' of ' + w.steps.length + ')</span></h4><div class="lf-bar"><i style="width:' + Math.round(n / w.steps.length * 100) + '%"></i></div>' +
        w.steps.slice(0, n).map(function (s) { return '<div class="lf-step done">✓ ' + esc(s.say) + '<br><code>$ ' + esc(s.cmd) + '</code></div>'; }).join('') +
        (n < w.steps.length ? '<div class="lf-step"><b>Next:</b> ' + esc(w.steps[n].say) + '</div><button class="btn-secondary" id="lfNext">▶ Run next step</button>' : '<div class="lf-step"><b>Your turn.</b> Same pattern, on <code>mine</code>. The tasks below check it.</div>');
      var b = el.querySelector('#lfNext'); if (b) b.onclick = function () { var s = w.steps[WK[r.lab.id] || 0]; WK[r.lab.id] = (WK[r.lab.id] || 0) + 1; KL.runner.say('# ' + s.say, ''); KL.runner.run(s.cmd); draw(); };
    }
    draw(); $('lrTasks').parentNode.insertBefore(el, $('lrTasks'));
  }

  // ── 3. predict, then run ──
  var CHANGING = /^(k|kubectl)\s+(apply|create|delete|patch|set|scale|rollout|label|annotate|expose|run|cordon|uncordon|drain|taint|replace|certificate|autoscale)\b/;
  function predOn() { return localStorage.getItem('kubedrill:predon') === '1'; }
  function stats() { return rd(PRED, { r: 0, t: 0 }); }
  function bindPredict(r) {
    var inp = $('lrIn'); if (!inp || inp.dataset.lfp) return; inp.dataset.lfp = '1';
    var bar = document.querySelector('.lr-mode'); if (bar && !$('lfPredT')) { var lb = document.createElement('label'); lb.className = 'lf-toggle'; lb.innerHTML = '<input type="checkbox" id="lfPredT"' + (predOn() ? ' checked' : '') + '> 🔮 Predict, then run'; lb.title = 'Before a command that changes the cluster, write what you expect. Then run it and grade yourself.'; bar.appendChild(lb); $('lfPredT').onchange = function () { localStorage.setItem('kubedrill:predon', this.checked ? '1' : '0'); }; }
    inp.addEventListener('keydown', function (e) {
      var rr = KL.runner.cur(); if (e.key !== 'Enter' || !predOn() || !rr || rr.mode !== 'learn' || rr.over || e.isComposing) return;
      var line = inp.value.trim(); if (!CHANGING.test(line) || $('lfPred')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var box = document.createElement('div'); box.id = 'lfPred'; box.className = 'lf-pred';
      box.innerHTML = '<b>🔮 Predict first:</b> <code>' + esc(line) + '</code><br>What will this change, and what will the output say?<textarea id="lfPredTx" placeholder="e.g. creates the configmap; pods become Ready within a few seconds"></textarea><button class="btn-secondary" id="lfPredGo">Run it</button> <button class="lr-linkbtn" id="lfPredSkip">Skip</button>';
      var term = $('lrTerm'); term.parentNode.insertBefore(box, term); $('lfPredTx').focus();
      function run(guess) { box.remove(); inp.value = ''; KL.runner.run(line); if (!guess) return; var g = document.createElement('div'); g.id = 'lfPred'; g.className = 'lf-pred'; g.innerHTML = '<b>Your guess:</b> ' + esc(guess) + '<br>Compare with the output above. Were you right? <button class="btn-secondary" data-ok="1">✓ Yes</button> <button class="btn-secondary" data-ok="0">✗ No</button>'; term.parentNode.insertBefore(g, term);
        g.querySelectorAll('button').forEach(function (b) { b.onclick = function () { var s = stats(); s.t++; if (b.dataset.ok === '1') s.r++; wr(PRED, s); g.innerHTML = 'Predictions you graded right: <b>' + s.r + ' / ' + s.t + '</b>'; setTimeout(function () { g.remove(); }, 2500); }; }); }
      $('lfPredGo').onclick = function () { run($('lfPredTx').value.trim()); }; $('lfPredSkip').onclick = function () { run(''); };
    }, true);
  }

  // ── 4. compare solutions ──
  function changes(list) { return list.filter(function (l) { return CHANGING.test(l.trim()) || /^(cat|tee|sed|echo|kubectl\s+(edit|exec))\b/.test(l.trim()) && /(>|sed -i|edit)/.test(l); }); }
  function comparePanel(r) {
    var old = $('lfCmp'); if (old) old.remove(); var fb = $('lrFeedback'); if (!fb || !r || r.mode !== 'learn') return;
    var mine = changes(r.hist), ref = r.lab.solution.filter(function (l) { return !/^\s*kubectl\s+(get|describe|logs|top|rollout status)\b/.test(l); });
    var el = document.createElement('div'); el.id = 'lfCmp'; el.className = 'lf-cmp';
    var verdict = !mine.length ? 'You solved it without a changing command (the cluster may have fixed itself, or you used the editor).' : mine.length < ref.length ? 'You used fewer changing commands than the reference. Check yours is not fragile (a hard-coded value).' : mine.length === ref.length ? 'Same number of changing commands as the reference.' : 'The reference needs ' + ref.length + ' changing command' + (ref.length === 1 ? '' : 's') + '; you used ' + mine.length + '. Look for a command that does two steps at once.';
    el.innerHTML = '<h4>🔍 Compare solutions</h4><div>' + esc(verdict) + '</div><div class="lf-cols"><div><b>Your changing commands (' + mine.length + ')</b><pre>' + esc(mine.join('\n') || '(none)') + '</pre></div><div><b>Reference (' + ref.length + ')</b><pre>' + esc(ref.join('\n')) + '</pre></div></div><div style="margin-top:8px"><button type="button" class="btn-secondary" id="lfCard" title="Draws a PNG in your browser. Nothing is uploaded.">🖼 Save completion card</button></div><div style="color:var(--text3);margin-top:6px">Different is fine if the checks pass. The reference prefers declarative one-liners (<code>set image</code>, <code>patch</code>, <code>create --dry-run=client -o yaml</code>).</div>';
    fb.parentNode.insertBefore(el, fb.nextSibling);
  }
  window.addEventListener('kl:labdone', function (e) { var r = KL.runner.cur(); if (r) setTimeout(function () { comparePanel(r); }, 80); });

  window.addEventListener('kl:runner', function () {
    var r = KL.runner.cur(); if (!r) return;
    ['lfCmp', 'lfPred'].forEach(function (i) { var x = $(i); if (x) x.remove(); });
    workedPanel(r); bindPredict(r); sourcesPanel(r);
    var host = $('lrTasks'); if (host && !host.dataset.lfobs) { host.dataset.lfobs = '1'; new MutationObserver(decorateHints).observe(host, { childList: true }); }
    decorateHints();
  });

  // ── 5. "why did my check fail": the command that shows the thing the checker looked at ──
  function q(v) { return /^[A-Za-z0-9_@%+=:,.\/-]+$/.test(v) ? v : "'" + String(v).replace(/'/g, "'\\''") + "'"; }
  KL.whyCmd = function (x, lab) {
    var a = x.a; if (!a) return ''; var ns = a.ns === undefined ? lab.ns : a.ns, n = ns ? ' -n ' + ns : '', c = '';
    switch (a.t) {
      case 'exists': case 'absent': c = 'kubectl get ' + a.ref + n; break;
      case 'jp': case 'jpRe': c = 'kubectl get ' + a.ref + n + ' -o jsonpath=' + q('{' + a.path + '}'); break;
      case 'qty': case 'fval': c = a.ref ? 'kubectl get ' + a.ref + n + ' -o jsonpath=' + q('{' + (a.path || '') + '}') : ''; break;
      case 'podsReady': c = 'kubectl get pods' + n + (a.sel ? ' -l ' + a.sel : '') + ' -o wide'; break;
      case 'noNotReady': c = 'kubectl get nodes'; break;
      case 'count': c = 'kubectl get ' + (a.kind || 'pods').toLowerCase() + n + (a.sel ? ' -l ' + a.sel : ''); break;
      case 'endpoints': c = 'kubectl get endpoints ' + a.svc + n; break;
      case 'curl': c = 'kubectl exec ' + a.from + n + ' -- wget -qO- -T 2 ' + a.to; break;
      case 'canI': c = 'kubectl auth can-i ' + (a.verb || 'get') + ' ' + (a.res || a.resource || 'pods') + (a.as ? ' --as ' + a.as : '') + n; break;
      case 'nodeCordoned': c = 'kubectl get node ' + a.node; break;
      case 'podsOffNode': c = 'kubectl get pods -A -o wide'; break;
      case 'file': case 'fileRe': case 'fileNo': c = 'cat ' + a.path; break;
      case 'noQuotaErr': c = 'kubectl describe quota' + n; break;
      case 'ctx': c = 'kubectl config get-contexts'; break;
      case 'kuser': c = 'kubectl config get-users'; break;
      default: c = '';
    }
    return c ? '<br><small class="lf-why">Look at it: <code>' + esc(c) + '</code> <button type="button" class="lr-linkbtn lf-use" data-c="' + esc(c) + '">put in terminal</button></small>' : '';
  };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.lf-use'); if (!b) return; var i = $('lrIn'); if (i) { i.value = b.dataset.c; i.focus(); } });

  // ── 6. completion card: a PNG drawn on a canvas in your browser; nothing is uploaded ──
  function wrap(ctx, text, maxW) { var words = String(text).split(' '), lines = [], line = ''; words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }); if (line) lines.push(line); return lines; }
  KL.cardPng = function (r, cb) {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 630; var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 1200, 630); g.addColorStop(0, '#090c16'); g.addColorStop(1, '#10204a'); x.fillStyle = g; x.fillRect(0, 0, 1200, 630);
    var secs = Math.floor(((r.endAt || Date.now()) - r.start) / 1000), hints = Object.keys(r.hintIdx || {}).reduce(function (a, k) { return a + (r.hintIdx[k] || 0); }, 0);
    var mm = Math.floor(secs / 60), ss = secs % 60, F = 'Inter, system-ui, -apple-system, Segoe UI, sans-serif';
    x.fillStyle = '#22d3a5'; x.font = '600 26px ' + F; x.fillText('FREE · OFFLINE · NO ADS', 80, 100);
    x.fillStyle = '#e8eefc'; x.font = '700 64px ' + F; x.fillText('Lab ' + r.lab.num + ' complete', 80, 200);
    x.fillStyle = '#93a8c9'; x.font = '400 38px ' + F; wrap(x, r.lab.title.replace(/`/g, ''), 1040).slice(0, 3).forEach(function (l, i) { x.fillText(l, 80, 275 + i * 50); });
    var st = [[(mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss, 'time'], [String(r.hist.length), 'commands'], [String(hints), 'hints'], [String(r.checks), 'checks']];
    st.forEach(function (s, i) { var px = 80 + i * 260; x.fillStyle = '#63a4ff'; x.font = '700 54px ' + F; x.fillText(s[0], px, 470); x.fillStyle = '#93a8c9'; x.font = '400 24px ' + F; x.fillText(s[1], px, 505); });
    x.fillStyle = '#e8eefc'; x.font = '700 34px ' + F; x.fillText('Kube', 80, 576); var w = x.measureText('Kube').width; x.fillStyle = '#63a4ff'; x.fillText('Drill', 80 + w, 576);
    x.fillStyle = '#93a8c9'; x.font = '400 24px ' + F; x.fillText('kubedrill.eknathalabs.com', 300, 576);
    c.toBlob(function (b) { cb(b); }, 'image/png');
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#lfCard'); if (!b) return; var r = KL.runner.cur(); if (!r) return;
    KL.cardPng(r, function (blob) {
      var name = 'kubedrill-' + r.lab.id + '.png', f; try { f = new File([blob], name, { type: 'image/png' }); } catch (x) { f = null; }
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: 'KubeDrill lab ' + r.lab.num }).catch(function () { /* cancelled */ }); return; }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    });
  });

  // ── 7. source credits: official docs for the skills this lab practises ──
  function sourcesPanel(r) {
    var old = $('lfSrc'); if (old) old.remove(); var fb = $('lrFeedback'); if (!fb || !KL.sources) return; var l = KL.sources(baseId(r.lab)); if (!l.length) return;
    var d = document.createElement('details'); d.id = 'lfSrc'; d.className = 'lf-cmp';
    d.innerHTML = '<summary><b>📚 Official docs for this lab (' + l.length + ')</b></summary><ul style="margin:6px 0 0;padding-left:18px">' + l.map(function (x) { return '<li><a href="' + esc(x[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(x[0]) + '</a> <span style="color:var(--text3)">' + esc(x[1].replace(/^https?:\/\//, '').split('/')[0]) + '</span></li>'; }).join('') + '</ul><div style="color:var(--text3);margin-top:6px;font-size:12px">Credit: Kubernetes documentation (CC BY 4.0) and the linked projects. KubeDrill links to these pages and does not copy their text. They are the pages the real exams let you open.</div>';
    fb.parentNode.insertBefore(d, fb.nextSibling);
  }
  KL.predStats = stats;
})();
