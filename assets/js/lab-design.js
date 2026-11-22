/* Lab design layer (UI): constraint box, trap, "why this works", dead-end nudge, hint tracking, speed round,
   next rung of the difficulty ladder, and seeded variants. Data lives in data/lab-meta.js. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, store = KL.store;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function rd(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function base(lab) { return lab.variantOf ? Labs.byId[lab.variantOf] : lab; }
  function mmss(sec) { sec = Math.max(0, sec | 0); return ('0' + Math.floor(sec / 60)).slice(-2) + ':' + ('0' + sec % 60).slice(-2); }

  // ── weak spots: tasks that needed a hint ──
  var WEAK = 'kubedrill:weak', SPEED = 'kubedrill:speed';
  var D = KL.design = {
    weak: function () { return rd(WEAK, {}); },
    weakList: function () {
      var w = D.weak(), out = [];
      Object.keys(w).forEach(function (id) { var lab = Labs.byId[id]; if (!lab) return; Object.keys(w[id]).forEach(function (tid) { var t = Labs.allTasks({ flags: { stage2: true } }, lab).filter(function (x) { return x.id === tid; })[0]; if (t) out.push({ lab: lab, task: t, n: w[id][tid] }); }); });
      return out.sort(function (a, b) { return b.n - a.n; });
    },
    nextRung: function (lab) {
      var ld = Labs.ladderOf(lab.id); if (!ld) return null;
      for (var i = ld.at + 1; i < ld.ids.length; i++) if (Labs.byId[ld.ids[i]]) return { name: ld.name, lab: Labs.byId[ld.ids[i]], rung: i + 1, of: ld.ids.length };
      return null;
    },
    speedBest: function (id) { return rd(SPEED, {})[id] || 0; }
  };
  window.addEventListener('kl:hint', function (e) { var r = e.detail.run, w = rd(WEAK, {}), id = base(r.lab).id; w[id] = w[id] || {}; w[id][e.detail.task] = (w[id][e.detail.task] || 0) + 1; wr(WEAK, w); r.assisted = r.assisted || {}; r.assisted[e.detail.task] = true; });

  // ── dead-end detection: 15 commands and the cluster has not changed ──
  function sig(r) { try { return r.sim.list('Pod', r.lab.ns).map(function (p) { return p.metadata.name + ':' + r.sim.podStatus(p); }).join('|') + '#' + r.sim.list('Service', r.lab.ns).length + ':' + r.sim.events.length; } catch (e) { return ''; } }
  function wasMutation(line) { return /\b(apply|create|delete|patch|edit|scale|set|label|annotate|taint|cordon|uncordon|drain|rollout|replace|expose|run|annotate|ssh|kubeadm|etcdctl|systemctl)\b/.test(line); }
  window.addEventListener('kl:cmd', function (e) {
    var r = e.detail.run; if (!r || r.mode !== 'learn' || r.over) return;
    var d = r.dead = r.dead || { n: 0, sig: '', shown: false };
    if (wasMutation(e.detail.line)) { d.n = 0; d.shown = false; hideNudge(); return; }
    d.n++;
    if (d.n >= 15 && !d.shown) { d.shown = true; showNudge(r); }
  });
  function hideNudge() { var n = $('lrNudge'); if (n) n.remove(); }
  function showNudge(r) {
    var host = $('lrDesign'); if (!host || $('lrNudge')) return;
    var bad = null; try { bad = r.sim.list('Pod', r.lab.ns).filter(function (p) { return !r.sim.podReady(p) && !p.metadata.deletionTimestamp; })[0]; } catch (e) { /* ignore */ }
    var steps = ['`kubectl get events -n ' + r.lab.ns + ' --sort-by=.lastTimestamp`'];
    if (bad) steps.unshift('`kubectl describe pod ' + bad.metadata.name + ' -n ' + r.lab.ns + '` (it is ' + esc(r.sim.podStatus(bad)) + ')'); else steps.push('`kubectl get all -n ' + r.lab.ns + '`');
    steps.push('Re-read the task text for the exact name, namespace and value it expects.');
    var el = document.createElement('div'); el.id = 'lrNudge'; el.className = 'lr-nudge'; el.setAttribute('role', 'status');
    el.innerHTML = '<b>🧭 15 commands in a row without changing anything.</b> You may be reading the same output again. Try a different angle:<ul>' + steps.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul><button class="btn-secondary" id="lrNudgeX">Dismiss</button>';
    host.appendChild(el); $('lrNudgeX').onclick = hideNudge;
  }

  // ── panel under the story ──
  function decorate() {
    var r = KL.runner && KL.runner.cur(), host = $('lrDesign'); if (!r || !host) return; var lab = r.lab, h = '';
    if (lab.constraint) h += '<div class="lr-cons" id="lrCons"><span class="lr-cons-k">🔒 Constraint</span> ' + md(lab.constraint.text) + (lab.constraint.assert ? '' : ' <i>(not auto-checked)</i>') + '</div>';
    var ld = Labs.ladderOf(lab.id); if (ld) h += '<div class="lr-ladder">🪜 ' + esc(ld.name) + ' ladder · rung ' + (ld.at + 1) + ' of ' + ld.ids.length + '</div>';
    if (r.speed) h += '<div class="lr-speed">⚡ <b>Speed round.</b> No hints, no solution. Beat ' + mmss(r.speed.target) + '. Same fault, same checker.</div>';
    var vs = Labs.variantIds[base(lab).id]; if (vs && vs.length > 1) h += '<div class="lr-var">🎲 Variant ' + (vs.indexOf(lab.id) + 1) + ' of ' + vs.length + ' <button class="lr-linkbtn" id="lrVar">Try another variant</button></div>';
    host.innerHTML = h;
    if ($('lrVar')) $('lrVar').onclick = function () { gotoOther(lab); };
    r.dead = null;
  }
  function gotoOther(lab) { var vs = Labs.variantIds[base(lab).id] || [], others = vs.filter(function (x) { return x !== lab.id; }); if (!others.length) return; var pick = others[Math.floor(Math.random() * others.length)]; if (KL.sessions) KL.sessions.del('lab:' + pick); location.hash = 'lab/' + pick; }
  window.addEventListener('kl:runner', function () { setTimeout(decorate, 0); });
  window.addEventListener('kl:check', function (e) { var c = $('lrCons'); if (c && e.detail.res.constraint) c.classList.toggle('bad', !e.detail.res.constraint.ok); if ($('lrCons') === null) return; });

  // ── result card extras ──
  D.resultExtras = function (r, res) {
    var lab = r.lab, h = '', hints = Object.keys(r.hintIdx).reduce(function (a, k) { return a + (r.hintIdx[k] || 0); }, 0), clean = !hints && !r.solShown && r.mode === 'learn';
    if (r.mode === 'learn') h += '<div class="lr-clean ' + (clean ? 'yes' : 'no') + '">' + (clean ? '✓ <b>Clean solve</b>: no hints and no solution.' : '○ <b>Assisted</b>: ' + hints + ' hint' + (hints === 1 ? '' : 's') + (r.solShown ? ', solution viewed' : '') + '. The tasks that needed help are listed under Coverage → weak spots.') + '</div>';
    if (res.constraint) h += '<div class="lr-clean ' + (res.constraint.ok ? 'yes' : 'no') + '">' + (res.constraint.ok ? '✓ Constraint respected: ' : '✗ Constraint broken: ') + md(res.constraint.text) + '</div>';
    if (r.speed) { var secs = Math.floor(((r.endAt || Date.now()) - r.start) / 1000), best = rd(SPEED, {}), id = base(lab).id; if (!best[id] || secs < best[id]) { best[id] = secs; wr(SPEED, best); } h += '<div class="lr-clean ' + (secs <= r.speed.target ? 'yes' : 'no') + '">⚡ Speed round: <b>' + mmss(secs) + '</b> vs target ' + mmss(r.speed.target) + (secs <= r.speed.target ? ': beaten.' : ': not this time. Try again.') + ' Best: ' + mmss(best[id]) + '.</div>'; }
    if (lab.trap) h += '<div class="lr-trap"><b>⚠ The trap</b><p>' + md(lab.trap) + '</p></div>';
    if (lab.why) h += '<details class="lr-why"><summary>🧠 Why this works</summary><ol>' + lab.why.m.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ol>' + (lab.why.p ? '<p>Prove it: <code>' + esc(lab.why.p) + '</code> <button class="lr-linkbtn" id="lrProve">Run it</button></p>' : '') + '</details>';
    var nr = D.nextRung(lab), row = '';
    if (nr) row += '<a class="btn-primary" href="#lab/' + nr.lab.id + '">🪜 Next rung: ' + esc(nr.lab.num) + ' · ' + esc(nr.lab.diff) + ' →</a> ';
    if (r.mode === 'learn' && !r.speed) row += '<button class="btn-secondary" id="lrSpeed" title="Reset and solve the same fault again without hints">⚡ Fix it twice (speed round)</button> ';
    var vs = Labs.variantIds[base(lab).id]; if (vs && vs.length > 1) row += '<button class="btn-secondary" id="lrVar2">🎲 New variant</button>';
    return h + (row ? '<div class="lr-after lr-rung">' + row + '</div>' : '');
  };
  D.bindResult = function (r) {
    var lab = r.lab;
    if ($('lrProve')) $('lrProve').onclick = function () { KL.runner.run(lab.why.p); };
    if ($('lrVar2')) $('lrVar2').onclick = function () { gotoOther(lab); };
    if ($('lrSpeed')) $('lrSpeed').onclick = function () {
      var secs = Math.floor(((r.endAt || Date.now()) - r.start) / 1000), target = Math.max(45, Math.round(secs * 0.6));
      KL.labRun(lab.id, true).then(function (nr) { nr.mode = 'exam'; nr.start = Date.now(); nr.speed = { target: target }; location.hash = 'labs'; setTimeout(function () { location.hash = 'lab/' + lab.id; }, 30); });
    };
  };
})();
