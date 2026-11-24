/* Lab spaced review and speed benchmarks. Everything stays on this device (localStorage "kubedrill:labrev").
   After you pass a lab it is scheduled for review (3, 7, 21, then 60 days; a pass with the solution shown starts again at 1 day).
   The reviewed lab opens as a variant with different object names. The time figure compares you with the lab's own estimate and with your best,
   it is not measured against real exam data. */
(function () {
  'use strict';
  var KL = window.KL, KEY = 'kubedrill:labrev', DAY = 86400000, STEPS = [3, 7, 21, 60];
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mmss(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function estSecs(lab) { var m = /(\d+)/.exec(lab.time || ''); return m ? +m[1] * 60 : 0; }
  function baseOf(lab) { return lab.variantOf || lab.id; }
  function repeats(hist) { var seen = {}, n = 0; (hist || []).forEach(function (h) { var c = String(h).trim(); if (!c || /^(clear|history|help)\b/.test(c)) return; if (seen[c]) n++; seen[c] = 1; }); return n; }
  function stepsOf(lab) { return (lab.solution || []).filter(function (l) { return !/^\s*kubectl\s+(get|describe|logs|top)\b/.test(l); }).length || (lab.solution || []).length; }

  function record(r) {
    var lab = r.lab, id = baseOf(lab), base = KL.Labs.byId[id] || lab, d = load(), o = d[id] = d[id] || { n: 0, stage: 0, best: 0 };
    var secs = Math.max(1, Math.floor((Date.now() - r.start) / 1000)), hints = Object.keys(r.hintIdx || {}).reduce(function (a, k) { return a + (r.hintIdx[k] || 0); }, 0);
    var clean = !r.solShown && hints === 0, prev = o.best, wasDue = o.due && o.due <= Date.now();
    o.n++; o.last = Date.now(); o.lastSecs = secs; o.lastCmds = r.hist.length; o.clean = clean;
    if (!o.best || secs < o.best) o.best = secs;
    if (r.solShown) o.stage = 0; else if (clean || !o.n) o.stage = Math.min(STEPS.length, o.stage + 1); else o.stage = Math.max(o.stage, 1);
    o.due = Date.now() + (r.solShown ? 1 : STEPS[Math.max(0, Math.min(STEPS.length, o.stage) - 1)]) * DAY;
    save(d);
    return { o: o, secs: secs, prevBest: prev, clean: clean, wasDue: wasDue, est: estSecs(base), steps: stepsOf(base), cmds: r.hist.length, reps: repeats(r.hist) };
  }
  function days(ts) { var n = Math.round((ts - Date.now()) / DAY); return n <= 0 ? 'now' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; }
  function bench(x, lab) {
    var cmp = x.est ? (x.secs <= x.est ? 'inside the estimate of ' + Math.round(x.est / 60) + ' min' : 'over the estimate of ' + Math.round(x.est / 60) + ' min') : '';
    var best = !x.prevBest ? 'first pass recorded' : x.secs < x.prevBest ? 'new personal best (was ' + mmss(x.prevBest) + ')' : 'your best is ' + mmss(x.o.best);
    var tip = x.cmds > x.steps * 3 ? 'You typed ' + x.cmds + ' commands for a ' + x.steps + '-step reference path. Most of the gap is usually looking around: try one describe, then act.' : x.reps > 1 ? 'You repeated ' + x.reps + ' commands exactly. History (up arrow) or Ctrl-R saves the retyping.' : 'Your command count is close to the reference path.';
    return '<h4>⏱ Speed and review</h4><div class="lb-row"><b>' + mmss(x.secs) + '</b> ' + esc(cmp) + ' · ' + esc(best) + '</div><div class="lb-row">' + x.cmds + ' commands · reference path ' + x.steps + ' step' + (x.steps === 1 ? '' : 's') + (x.clean ? ' · no hints, no solution' : '') + '</div><div class="lb-row lb-tip">' + esc(tip) + '</div><div class="lb-row">Next review of this lab: <b>' + days(x.o.due) + '</b> (a variant with different names).</div><small>The estimate is the lab\'s own time guide, not a figure from the real exam.</small>';
  }
  var rec = null;
  window.addEventListener('kl:check', function (e) {
    var r = e.detail && e.detail.run, res = e.detail && e.detail.res; if (!r || !res || !res.ok || r._revDone || res.score && r.capDone) return;
    r._revDone = true; rec = { x: record(r), lab: r.lab };
  });
  window.addEventListener('kl:labdone', function () {
    setTimeout(function () {
      var fb = document.getElementById('lrFeedback'); if (!fb || !rec) return; var old = document.getElementById('lrBench'); if (old) old.remove();
      var el = document.createElement('div'); el.id = 'lrBench'; el.className = 'lf-cmp lr-bench'; el.innerHTML = bench(rec.x, rec.lab); fb.parentNode.insertBefore(el, fb.nextSibling);
    }, 140);
  });

  function dueList() {
    var d = load(), now = Date.now();
    return Object.keys(d).filter(function (id) { return KL.Labs.byId[id] && d[id].due && d[id].due <= now; }).sort(function (a, b) { return d[a].due - d[b].due; });
  }
  function upcoming() { var d = load(), now = Date.now(); return Object.keys(d).filter(function (id) { return KL.Labs.byId[id] && d[id].due > now; }).sort(function (a, b) { return d[a].due - d[b].due; }); }
  function openHref(id) { var seed = 'rev' + (load()[id] || {}).n + new Date().toISOString().slice(0, 10); return '#lab/' + (KL.Labs.variantFor ? KL.Labs.variantFor(id, seed) : id); }
  function html() {
    var d = load(), due = dueList(), up = upcoming().slice(0, 6), L = KL.Labs, sets = L.list.filter(function (l) { return l.symptomSet; });
    var row = function (id, late) { var l = L.byId[id], o = d[id]; return '<div class="tr-row lb-item"><span><a href="' + openHref(id) + '">' + esc(l.num + ' ' + l.title) + '</a><small> ' + esc(l.track.join('/')) + ' · passed ' + o.n + '×' + (o.best ? ' · best ' + mmss(o.best) : '') + '</small></span><em>' + (late ? 'due ' + days(o.due) : days(o.due)) + '</em></div>'; };
    return '<div class="tr-card"><h3>Lab review</h3><p class="pro-note">Labs you passed come back after 3, 7, 21 and 60 days, as a variant with different names, so you practise the pattern and not the answer. Nothing leaves this device.</p>' +
      (due.length ? '<h4>Due now (' + due.length + ')</h4>' + due.slice(0, 8).map(function (id) { return row(id, true); }).join('') : '<p>' + (Object.keys(d).length ? 'Nothing is due. Come back when a lab below falls due.' : 'No reviews yet: pass a lab and it is scheduled here.') + '</p>') +
      (up.length ? '<h4>Coming up</h4>' + up.map(function (id) { return row(id, false); }).join('') : '') + '</div>' +
      '<div class="tr-card"><h3>Same symptom, different cause</h3><p class="pro-note">One status, several causes. The skill is to read the evidence for each instead of repeating the fix that worked last time.</p>' +
      sets.map(function (l) { return '<div class="tr-row"><span><a href="#lab/' + l.id + '">' + esc(l.num + ' ' + l.title) + '</a></span><em>' + (KL.store.labDone(l.id) ? 'done' : l.time) + '</em></div>'; }).join('') + '</div>';
  }
  KL.labReview = { data: load, due: dueList, upcoming: upcoming, html: html, record: record, estSecs: estSecs, stepsOf: stepsOf, repeats: repeats, STEPS: STEPS };
})();
