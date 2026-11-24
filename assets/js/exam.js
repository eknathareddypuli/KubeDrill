/* Timed exam mode: a set of interactive labs, no hints/checker, countdown, scored at the end (pass ≥ 66%). */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, store = KL.store, $ = function (id) { return document.getElementById(id); };
  var S = KL.exam = { active: null };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(sec) { sec = Math.max(0, Math.floor(sec)); var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' : '') + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2); }
  var timer = null;
  var PASS = { CKA: 66, CKAD: 66, CKS: 67 };
  function passFor(track) { var t = String(track || '').split(' ')[0]; return PASS[t] || 66; }
  S.PASS = PASS;
  var HONEST = '<div class="ex-honest"><b>Practice, not prediction.</b> These mocks use the built-in simulator and lab-sized tasks. Task style, difficulty, wording and scoring differ from the real exam, and a pass here does not mean you will pass there (or the other way round). Use the score to find weak areas, then confirm on a real cluster. KubeDrill is independent: not affiliated with or endorsed by the CNCF or The Linux Foundation, and it uses no real exam questions.</div>';
  var PRESETS = { mini: { label: 'Mini · 30 min · 4 tasks', n: 4, mins: 30 }, std: { label: 'Standard · 60 min · 8 tasks', n: 8, mins: 60 }, full: { label: 'Full · 120 min · 14 tasks', n: 14, mins: 120 } };

  function pick(track, n) {
    var pool = Labs.list.filter(function (l) { return track === 'ALL' || l.track.indexOf(track) >= 0; });
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    return pool.slice(0, n).map(function (l) { return l.id; });
  }
  // ── curated mock-exam bundles (deterministic, weighted, domain report) ──
  var WT = { Beginner: 4, Intermediate: 6, Advanced: 9 };
  function weightsFor(ids) { var tot = 0, w = {}; ids.forEach(function (id) { tot += WT[Labs.byId[id].diff] || 6; }); ids.forEach(function (id) { w[id] = Math.round((WT[Labs.byId[id].diff] || 6) / tot * 1000) / 10; }); return w; }
  // official CNCF curriculum domains and weights (public, from the exam pages) mapped onto our lab domains
  var CURR = {
    CKA: [['Troubleshooting', 30], ['Cluster Architecture, Installation and Configuration', 25], ['Services and Networking', 20], ['Workloads and Scheduling', 15], ['Storage', 10]],
    CKAD: [['Application Environment, Configuration and Security', 25], ['Application Design and Build', 20], ['Application Deployment', 20], ['Services and Networking', 20], ['Application Observability and Maintenance', 15]],
    CKS: [['Supply Chain Security', 20], ['Minimize Microservice Vulnerabilities', 20], ['Monitoring, Logging and Runtime Security', 20], ['Cluster Hardening', 15], ['System Hardening', 15], ['Cluster Setup', 10]]
  };
  S.CURR = CURR;
  function bucket(track, lab) {
    var d = lab.domain || '', t = (lab.title + ' ' + lab.id).toLowerCase();
    if (track === 'CKA') return /troubl|incident/i.test(d + t) ? CURR.CKA[0][0] : /storage|pvc|volume/i.test(d + t) ? CURR.CKA[4][0] : /network|service|dns|ingress|gateway|netpol/i.test(d + t) ? CURR.CKA[2][0] : /schedul|workload|deploy|taint|affinity|hpa|scale/i.test(d + t) ? CURR.CKA[3][0] : CURR.CKA[1][0];
    if (track === 'CKAD') return /observ|probe|log|debug|monitor/i.test(d + t) ? CURR.CKAD[4][0] : /network|service|ingress|netpol|dns/i.test(d + t) ? CURR.CKAD[3][0] : /deploy|rollout|rolling|helm|kustom/i.test(d + t) ? CURR.CKAD[2][0] : /config|secret|security|rbac|serviceaccount|quota|limit/i.test(d + t) ? CURR.CKAD[0][0] : CURR.CKAD[1][0];
    return /image|scan|supply|registry|trivy/i.test(t) ? CURR.CKS[0][0] : /netpol|psa|pod security|secret|multitenant|sandbox|mtls|default-deny/i.test(t) ? CURR.CKS[1][0] : /audit|falco|runtime|log|monitor/i.test(t) ? CURR.CKS[2][0] : /rbac|sa-token|serviceaccount|binding|cluster-admin|api/i.test(t) ? CURR.CKS[3][0] : /seccomp|apparmor|hardening|sys|kernel|privileg/i.test(t) ? CURR.CKS[4][0] : CURR.CKS[5][0];
  }
  S.bucket = bucket;
  function currIds(track, n) {
    var pool = Labs.list.filter(function (l) { return l.track.indexOf(track) >= 0; }), by = {}, ids = [];
    pool.forEach(function (l) { (by[bucket(track, l)] = by[bucket(track, l)] || []).push(l); });
    CURR[track].forEach(function (d) { var want = Math.max(1, Math.round(d[1] / 100 * n)), arr = (by[d[0]] || []).slice(0, want); arr.forEach(function (l) { ids.push(l.id); }); });
    pool.forEach(function (l) { if (ids.length < n && ids.indexOf(l.id) < 0) ids.push(l.id); });
    return ids.slice(0, n);
  }
  S.bundles = function () {
    var out = [];
    ['CKA', 'CKAD', 'CKS'].forEach(function (tr) {
      var pool = Labs.list.filter(function (l) { return l.track.indexOf(tr) >= 0; }), g = tr === 'CKS' ? 2 : 3;
      for (var b = 0; b < g; b++) {
        var ids = pool.filter(function (l, i) { return i % g === b; }).map(function (l) { return l.id; }).slice(0, 12); if (ids.length < 4) continue;
        var sum = ids.reduce(function (a, id) { return a + (parseInt(Labs.byId[id].time, 10) || 10); }, 0);
        out.push({ id: tr.toLowerCase() + '-mock-' + (b + 1), name: tr + ' Mock ' + (b + 1), track: tr, ids: ids, mins: Math.max(45, Math.min(120, Math.round(sum * 0.8 / 5) * 5)) });
      }
    });
    ['CKA', 'CKAD', 'CKS'].forEach(function (tr) {
      var ids = currIds(tr, 12); if (ids.length < 4) return;
      var sum = ids.reduce(function (a, id) { return a + (parseInt(Labs.byId[id].time, 10) || 10); }, 0);
      out.push({ id: tr.toLowerCase() + '-curr', name: tr + ' Curriculum-weighted', track: tr, ids: ids, mins: Math.max(60, Math.min(120, Math.round(sum * 0.8 / 5) * 5)), curr: true });
    });
    // difficulty-level mocks: a fixed, repeatable set of tasks at one level, so you can start gentle and work up
    ['CKA', 'CKAD', 'CKS'].forEach(function (tr) {
      ['Beginner', 'Intermediate', 'Advanced'].forEach(function (lv) {
        var V = KL.versions, tv = V ? V.getTarget() : '';
        var pool = Labs.list.filter(function (l) { return l.track.indexOf(tr) >= 0 && l.diff === lv && !l.capstone && !/incident/i.test(l.domain || '') && (parseInt(l.time, 10) || 10) <= 20 && (!V || V.status(l, tv).ok); });
        if (pool.length < 6) return;
        var ids = shuf(pool, rng('kubedrill:level:' + tr + ':' + lv)).slice(0, lv === 'Beginner' ? 8 : 10).map(function (l) { return l.id; });
        var sum = ids.reduce(function (a, id) { return a + (parseInt(Labs.byId[id].time, 10) || 10); }, 0);
        out.push({ id: tr.toLowerCase() + '-level-' + lv.toLowerCase(), name: tr + ' Mock · ' + lv, track: tr, ids: ids, mins: Math.max(45, Math.min(120, Math.round(sum * 0.8 / 5) * 5)), level: lv });
      });
    });
    ['CKA', 'CKAD', 'CKS'].forEach(function (tr) { out.push({ id: tr.toLowerCase() + '-full', name: tr + ' Full mock', track: tr, ids: new Array(16), mins: 120, full: true }); });
    // numbered full mocks: the same 16 tasks and the same variant names every time, no task shared with an earlier numbered mock
    ['CKA', 'CKAD', 'CKS'].forEach(function (tr) { for (var k = 1; k <= FIXED_N[tr]; k++) out.push({ id: tr.toLowerCase() + '-full-' + k, name: tr + ' Full mock ' + k, track: tr, ids: new Array(16), mins: 120, full: true, fixed: k }); });
    ['CKA', 'CKAD', 'CKS'].forEach(function (tr) { out.push({ id: tr.toLowerCase() + '-full-hard', name: tr + ' Full mock (hard)', track: tr, ids: new Array(16), mins: 120, full: true, fixed: 0, hard: true }); });
    return out;
  };
  // Full mock: 16 tasks, 120 minutes, picked by official domain weights from tasks that can be done in about ten minutes,
  // each as a randomly chosen variant (different names every attempt). Honours the Kubernetes version you set (version-aware labs).
  var FIXED_N = { CKA: 3, CKAD: 3, CKS: 2 };
  function rng(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return function () { h |= 0; h = h + 0x6D2B79F5 | 0; var t = Math.imul(h ^ h >>> 15, 1 | h); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuf(arr, rnd) { var a = arr.slice(), i, j, t; for (i = a.length - 1; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // opts.fixed = n (1..): deterministic mock number n; opts.hard: prefer Advanced tasks
  function fullIds(track, seed, opts) {
    opts = opts || {};
    var V = KL.versions, tv = V ? V.getTarget() : '', det = opts.fixed !== undefined;
    function usable(l, max) { return l.track.indexOf(track) >= 0 && !l.capstone && !/incident/i.test(l.domain || '') && (parseInt(l.time, 10) || 10) <= max && (!V || V.status(l, tv).ok); }
    var pool = Labs.list.filter(function (l) { return usable(l, 12); }); if (pool.length < 16 * (det ? FIXED_N[track] : 1)) pool = Labs.list.filter(function (l) { return usable(l, 15); }); if (pool.length < 16) pool = Labs.list.filter(function (l) { return usable(l, 99); });
    if (opts.hard) { var adv = pool.filter(function (l) { return l.diff === 'Advanced' || l.diff === 'Intermediate'; }); if (adv.length >= 16) pool = adv; }
    function pick(excl, rnd) {
      var cand = pool.filter(function (l) { return excl.indexOf(l.id) < 0; }); if (cand.length < 16) cand = pool;
      var by = {}, ids = []; cand.forEach(function (l) { (by[bucket(track, l)] = by[bucket(track, l)] || []).push(l); });
      Object.keys(by).forEach(function (k) { by[k] = opts.hard ? shuf(by[k], rnd).sort(function (x, y) { return (y.diff === 'Advanced') - (x.diff === 'Advanced'); }) : shuf(by[k], rnd); });
      CURR[track].forEach(function (d) { var want = Math.max(1, Math.round(d[1] / 100 * 16)), arr = by[d[0]] || []; for (var i = 0; i < want && arr.length; i++) ids.push(arr.shift().id); });
      var rest = shuf(Object.keys(by).reduce(function (a, k) { return a.concat(by[k]); }, []), rnd);
      while (ids.length < 16 && rest.length) { var x = rest.shift(); if (ids.indexOf(x.id) < 0) ids.push(x.id); }
      return shuf(ids.slice(0, 16), rnd);
    }
    var ids;
    if (det) {
      var used = [], n = Math.max(1, opts.fixed || 1), k, rnd;
      for (k = 1; k <= n; k++) { rnd = rng('kubedrill:' + track + ':' + (opts.hard ? 'hard' : k)); ids = pick(opts.hard ? [] : used, rnd); used = used.concat(ids); }
      return ids.map(function (id) { return Labs.variantFor ? Labs.variantFor(id, 'fixed' + (opts.hard ? 'h' : n) + id) : id; });
    }
    ids = pick([], Math.random);
    return ids.map(function (id) { return Labs.variantFor ? Labs.variantFor(id, seed + id) : id; });
  }
  S.fullIds = fullIds;
  S.startBundle = function (bid, env) {
    var b = S.bundles().filter(function (x) { return x.id === bid; })[0]; if (!b) return;
    var seed = String(Date.now()); if (b.full) b.ids = fullIds(b.track, seed, b.fixed !== undefined ? { fixed: b.fixed, hard: !!b.hard } : null);
    Promise.all(b.ids.map(function (id) { return KL.labRun(id, true); })).then(function () {
      S.result = null; S.active = { track: b.track, ids: b.ids, start: Date.now(), end: Date.now() + b.mins * 60000, mins: b.mins, flags: {}, w: weightsFor(b.ids), env: !!env, name: b.name, curr: !!b.curr, full: !!b.full, tt: {}, cur: null }; saveActive();
      if (location.hash === '#exam') render(); else location.hash = 'exam';
    });
  };
  S.start = function (track, preset, env) {
    var p = PRESETS[preset]; var ids = pick(track, p.n);
    Promise.all(ids.map(function (id) { return KL.labRun(id, true); })).then(function () {
      S.active = { track: track, ids: ids, start: Date.now(), end: Date.now() + p.mins * 60000, mins: p.mins, flags: {}, w: weightsFor(ids), env: !!env }; saveActive();
      if (location.hash === '#exam') render(); else location.hash = 'exam';
    });
  };
  var AK = 'kubedrill:exam-active';
  function saveActive() { try { if (S.active) localStorage.setItem(AK, JSON.stringify(S.active)); else localStorage.removeItem(AK); } catch (e) { /* ignore */ } }
  S.save = saveActive;
  function restoreActive() { if (S.active) return false; try { var a = JSON.parse(localStorage.getItem(AK)); if (a && a.ids && a.ids.every(function (id) { return Labs.byId[id]; })) { S.active = a; return true; } } catch (e) { /* ignore */ } return false; }
  // time per task: counts only while the task's lab page is open
  function flushTime(a) { if (a && a.cur) { a.tt = a.tt || {}; a.tt[a.cur.id] = (a.tt[a.cur.id] || 0) + (Date.now() - a.cur.since) / 1000; a.cur = null; } }
  function trackNav() {
    var a = S.active; if (!a) return; var m = /^#lab\/([^/?]+)/.exec(location.hash || ''), id = m && a.ids.indexOf(m[1]) >= 0 ? m[1] : null;
    if (a.cur && a.cur.id === id) return; flushTime(a); if (id) a.cur = { id: id, since: Date.now() }; saveActive();
  }
  window.addEventListener('hashchange', trackNav); setTimeout(trackNav, 300);
  S.finish = function () {
    var a = S.active; if (!a) return; clearInterval(timer); flushTime(a); S.active = null; saveActive();
    Promise.all(a.ids.map(function (id) { return KL.labRun(id); })).then(function (runs) { finishWith(a, runs); });
  };
  // speed coach: reads the command history of each task and points out slow habits (no spoilers, no grading)
  function coach(runs, rows) {
    var tips = [], all = []; runs.forEach(function (r) { all = all.concat(r.hist || []); });
    var full = all.filter(function (c) { return /^kubectl\s/.test(c); }).length, kshort = all.filter(function (c) { return /^k\s/.test(c); }).length;
    var ed = all.filter(function (c) { return /^(vi|vim|nano)\s/.test(c); }).length, edit = all.filter(function (c) { return /^(k|kubectl)\s+edit\b/.test(c); }).length;
    var dry = all.filter(function (c) { return /--dry-run|\$do\b/.test(c); }).length, expl = all.filter(function (c) { return /^(k|kubectl)\s+explain\b/.test(c); }).length;
    var imp = all.filter(function (c) { return /^(k|kubectl)\s+(set|scale|patch|label|annotate|taint|expose|create|run)\b/.test(c); }).length;
    var untouched = rows.filter(function (x, i) { return !(runs[i].hist || []).length; });
    if (full >= 8 && kshort < full / 4) tips.push('You typed <code>kubectl</code> ' + full + ' times. In the exam <code>k</code> is already an alias, which saves about ' + full * 6 + ' keystrokes. Practise with <code>k</code>.');
    if (ed >= 3 && !dry) tips.push('You opened an editor ' + ed + ' times but never generated YAML. Try <code>k create deploy x --image=nginx $do > x.yaml</code>, then edit only the lines you need.');
    if (edit >= 3 && imp === 0) tips.push('You used <code>kubectl edit</code> ' + edit + ' times. One-line <code>k set image</code>, <code>k scale</code>, <code>k patch</code> or <code>k label</code> is usually faster and easier to repeat.');
    if (!expl && ed >= 2) tips.push('You never ran <code>kubectl explain</code>. It is the fastest way to find a field name without leaving the terminal.');
    if (untouched.length) tips.push(untouched.length + ' task' + (untouched.length > 1 ? 's were' : ' was') + ' never attempted. Real exams give partial credit per task, so a first quick pass over every task usually beats finishing a few perfectly.');
    if (!tips.length) tips.push('No slow habits stood out. Keep timing yourself: the real exam is mostly about speed on tasks you already know.');
    return tips;
  }
  // review screen: where the time went, which tasks to revisit and which doc pages cover them
  function reviewHtml(r) {
    var tot = r.rows.reduce(function (a, x) { return a + x.t; }, 0), slow = r.rows.filter(function (x) { return x.t > r.budget * 1.6; }), failT = r.rows.filter(function (x) { return !x.res.ok; }).reduce(function (a, x) { return a + x.t; }, 0);
    var db = KL.debrief || {};
    var h = '<div class="ex-coach"><h3>⏱ Where the time went</h3><p>You spent ' + fmt(tot) + ' on tasks (budget ' + fmt(r.budget) + ' each).' + (tot ? ' ' + Math.round(failT / tot * 100) + '% of it went on tasks that did not pass.' : '') + (slow.length ? ' Over budget: ' + slow.length + ' task' + (slow.length > 1 ? 's' : '') + '. In the real exam, flag a task and move on once it passes about 1.5 times its share of the clock.' : ' Pacing looked even.') + '</p>' +
      '<table class="ex-rev"><thead><tr><th></th><th>Task</th><th>Weight</th><th>Time</th><th>Revisit</th></tr></thead><tbody>' + r.rows.map(function (x) {
        var base = x.lab.variantOf || x.lab.id, src = !x.res.ok && KL.sources ? KL.sources(base).slice(0, 2) : [], why = !x.res.ok && db[base] ? db[base][0] : '';
        return '<tr><td class="' + (x.res.ok ? 'okq' : 'badq') + '">' + (x.res.ok ? '✓' : '✗') + '</td><td>' + esc(x.lab.title) + (x.flag ? ' ⚑' : '') + (!x.tried ? ' <em>(not attempted)</em>' : '') + '</td><td>' + (x.w ? x.w + '%' : '') + '</td><td class="' + (x.t > r.budget * 1.6 ? 'slow' : '') + '">' + fmt(x.t) + '</td><td>' + (why ? '<em>' + esc(String(why).replace(/`/g, '')).slice(0, 170) + '</em><br>' : '') + src.map(function (z) { return '<a href="' + esc(z[1]) + '" target="_blank" rel="noopener">' + esc(z[0]) + '</a>'; }).join(' · ') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return h;
  }
  function finishWith(a, runs) {
    var w = a.w || weightsFor(a.ids), dom = {};
    var rows = a.ids.map(function (id, i) { var lab = Labs.byId[id], res = Labs.check(runs[i].sim, lab); return { lab: lab, res: res, w: w[id] || 0, t: (a.tt && a.tt[id]) || 0, tried: (runs[i].hist || []).length, flag: !!(a.flags && a.flags[id]) }; });
    var got = 0, tot = 0, score = 0, wt = 0; rows.forEach(function (r) { got += r.res.passed; tot += r.res.total; var f = r.res.total ? r.res.passed / r.res.total : 0; score += r.w * f; wt += r.w; var dn = a.curr && CURR[a.track] ? bucket(a.track, r.lab) : r.lab.domain, d = dom[dn] = dom[dn] || { got: 0, w: 0 }; d.got += r.w * f; d.w += r.w; });
    var pct = wt ? Math.round(score / wt * 100) : 0, secs = Math.min(Math.round((Date.now() - a.start) / 1000), a.mins * 60);
    store.addExam({ date: Date.now(), track: a.name || a.track, pct: pct, got: got, tot: tot, secs: secs, n: a.ids.length });
    var domains = Object.keys(dom).map(function (k) { var off = a.curr && CURR[a.track] ? (CURR[a.track].filter(function (c) { return c[0] === k; })[0] || [0, 0])[1] : 0; return { name: k, pct: Math.round(dom[k].got / dom[k].w * 100), w: Math.round(dom[k].w), off: off }; }).sort(function (x, y) { return x.pct - y.pct; });
    S.result = { rows: rows, pct: pct, got: got, tot: tot, secs: secs, track: a.name || a.track, domains: domains, weighted: true, coach: coach(runs, rows), pass: passFor(a.track), full: !!a.full, budget: a.mins * 60 / a.ids.length, timed: !!(a.tt && Object.keys(a.tt).length) };
    render(); if (pct >= passFor(a.track) && KL.fx) KL.fx.confetti();
  }
  function render() {
    var root = $('examRoot'); if (!root) return; clearInterval(timer); if (!S.active && !S.result) restoreActive();
    var a = S.active, h = '<div class="section-header"><div class="section-tag">Exam Simulator</div><h2 class="section-title">Timed Exam Mode</h2><p class="section-desc">Real exams are performance-based: no hints, no checker, a countdown. Pick a track and go. Each task is a broken cluster in the built-in simulator; you are scored on the end state (pass mark 66%).</p></div>';
    if (a) {
      h += '<div class="ex-bar"><div class="ex-time" id="exTime">--:--</div><div class="ex-sub">time remaining · ' + a.ids.length + ' tasks · ' + a.track + '</div><button class="btn-primary" id="exFinish">Finish &amp; score</button></div><div class="ex-list">' +
        a.ids.map(function (id, i) { var l = Labs.byId[id]; return '<a class="ex-q' + (a.flags[id] ? ' flag' : '') + '" href="#lab/' + id + '"><span class="ex-n">' + (i + 1) + '</span><span class="ex-t">' + esc(l.title) + '</span><span class="ex-w">' + (a.w && a.w[id] ? a.w[id] + '% · ' : '') + l.tasks.length + ' tasks · ' + l.time + '</span><span class="lab-diff diff-' + (l.diff === 'Beginner' ? 'beginner' : l.diff === 'Intermediate' ? 'intermediate' : 'advanced') + '">' + l.diff + '</span></a>'; }).join('') + '</div><p class="ex-note">Tip: do easy tasks first; use ⚑ Flag to mark tasks for review.' + (a.env ? ' <b>Real environment:</b> each task starts in the wrong context — run the <code>use-context</code> command it shows.' : ' The context is already set to each task\'s namespace.') + ' Leaving this page does not pause the clock.</p>';
      root.innerHTML = h; $('exFinish').onclick = function () { if (confirm('Finish the exam and see your score?')) S.finish(); };
      var tick = function () { var rem = (a.end - Date.now()) / 1000, el = $('exTime'); if (el) { el.textContent = fmt(rem); el.classList.toggle('low', rem < 300); el.classList.toggle('warn', rem >= 300 && rem < 1200); } if (rem <= 0) { clearInterval(timer); S.finish(); } };
      tick(); timer = setInterval(tick, 1000); return;
    }
    if (S.result) {
      var r = S.result, pm = r.pass || passFor(r.track), pass = r.pct >= pm;
      h += '<div class="ex-result ' + (pass ? 'pass' : 'fail') + '"><div class="ex-score">' + r.pct + '%</div><div class="ex-verdict">' + (pass ? '🏆 Above the pass mark (' + pm + '%) on this practice set' : '📚 Below the ' + pm + '% pass mark on this practice set') + '</div><div class="ex-sub">' + r.got + ' / ' + r.tot + ' checks · ' + fmt(r.secs) + ' used · ' + r.track + (r.weighted ? ' · weighted' : '') + '</div></div>' + (r.domains ? '<div class="ex-dom"><h3>Score by domain</h3>' + r.domains.map(function (d) { return '<div class="ex-dr"><span>' + esc(d.name) + (d.off ? ' <small>(exam weight ' + d.off + '%)</small>' : '') + '</span><div class="ex-db"><div class="' + (d.pct >= 66 ? 'ok' : 'no') + '" style="width:' + d.pct + '%"></div></div><b>' + d.pct + '%</b></div>'; }).join('') + '<p class="ex-note">Weakest area: <b>' + esc(r.domains[0].name) + '</b> — retry its tasks below in practice mode.</p></div>' : '') +
        (r.coach ? '<div class="ex-coach"><h3>⚡ Speed coach</h3><ul>' + r.coach.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' : '') + (r.timed ? reviewHtml(r) : '') + '<div class="ex-list">' + r.rows.map(function (x) { return '<div class="ex-q ' + (x.res.ok ? 'okq' : 'badq') + '"><span class="ex-n">' + (x.res.ok ? '✓' : '✗') + '</span><span class="ex-t">' + esc(x.lab.title) + '</span><span class="ex-w">' + (x.w ? x.w + '% · ' : '') + x.res.passed + '/' + x.res.total + '</span><a href="#lab/' + x.lab.id + '" onclick="KL.labRun(\'' + x.lab.id + '\',true)">retry in practice mode</a></div>'; }).join('') + '</div><button class="btn-primary" id="exAgain" style="margin-top:1.5rem">New exam</button>';
      h += HONEST; root.innerHTML = h; var tk = String(r.track || r.name || (S.last && S.last.track) || '').split(' ')[0]; if (KL.readinessHtml && /^(CKA|CKAD|CKS)$/.test(tk)) root.insertAdjacentHTML('beforeend', KL.readinessHtml(tk)); $('exAgain').onclick = function () { S.result = null; render(); }; return;
    }
    var hist = store.data().exams.slice(-8).reverse();
    h += '<div class="ex-setup"><label>Track<select id="exTrack"><option value="CKA">CKA — Administrator</option><option value="CKAD">CKAD — Developer</option><option value="CKS">CKS — Security</option><option value="ALL">Mixed</option></select></label><label>Length<select id="exLen">' + Object.keys(PRESETS).map(function (k) { return '<option value="' + k + '">' + PRESETS[k].label + '</option>'; }).join('') + '</select></label><button class="btn-primary" id="exGo">▶ Start exam</button></div>' +
      '<div class="ex-bundles"><h3>Mock exam bundles</h3><p class="ex-note">Fixed sets with weighted tasks and a domain report. The <b>Full mock</b> is 16 tasks in 120 minutes, drawn by official domain weights, and different variants every attempt. <b>Full mock 1, 2, 3</b> are fixed sets (the same 16 tasks every time, none shared between them) so you can retake one and compare; the <b>hard</b> set favours Advanced tasks. <b>Mock · Beginner / Intermediate / Advanced</b> are fixed sets of tasks at one difficulty, so you can start gentle and work up. Pass marks used: CKA 66%, CKAD 66%, CKS 67% (check the current handbook).</p>' + HONEST + '<div class="ex-bgrid">' + S.bundles().map(function (b) { return '<button class="ex-b" data-b="' + b.id + '"><b>' + b.name + '</b><span>' + b.ids.length + ' tasks · ' + b.mins + ' min</span></button>'; }).join('') + '</div><label class="ex-env"><input type="checkbox" id="exEnv" checked> Real exam environment <small>(no checker or cluster panel, several contexts — switch with <code>kubectl config use-context</code>)</small></label></div>' +
      '<div class="ex-hist"><h3>Your attempts</h3>' + (hist.length ? '<table><tr><th>Date</th><th>Track</th><th>Score</th><th>Time</th></tr>' + hist.map(function (e) { return '<tr><td>' + new Date(e.date).toLocaleDateString() + '</td><td>' + e.track + '</td><td class="' + (e.pct >= 66 ? 'p' : 'f') + '">' + e.pct + '%</td><td>' + fmt(e.secs) + '</td></tr>'; }).join('') + '</table>' : '<p class="ex-note">No attempts yet.</p>') + '</div>' +
      '<p class="ex-note">Disclaimer: the simulator is a teaching model of Kubernetes behaviour, not the real exam environment. Practise on a real cluster with the kind lab packs as well.</p>';
    root.innerHTML = h; $('exGo').onclick = function () { S.start($('exTrack').value, $('exLen').value, $('exEnv').checked); };
    root.querySelectorAll('.ex-b').forEach(function (b) { b.onclick = function () { S.startBundle(b.dataset.b, $('exEnv').checked); }; });
  }
  restoreActive(); if (S.active && S.active.end < Date.now()) S.finish();
  KL.route('exam', render);
  // adapt the lab runner while an exam is running
  window.addEventListener('kl:runner', function (e) {
    var a = S.active; if (!a || a.ids.indexOf(e.detail.lab.id) < 0) return;
    var bar = document.querySelector('.lr-bar'); if (!bar) return;
    var chk = $('lrCheck'); if (chk) { chk.textContent = '⚑ Flag'; chk.onclick = function () { a.flags[e.detail.lab.id] = !a.flags[e.detail.lab.id]; saveActive(); chk.classList.toggle('flagged', !!a.flags[e.detail.lab.id]); }; }
    var rs = $('lrReset'); if (rs) rs.remove();
    ['.lr-hints', '.lr-sol', '.lr-pack', '.lr-feedback', '.lr-mode', '#lrPredict', '.lr-exam-note'].forEach(function (q) { document.querySelectorAll(q).forEach(function (n) { n.remove(); }); });
    var back = bar.querySelector('.lr-back'); back.textContent = '← Exam overview'; back.href = '#exam';
    // question navigator: previous / next and a status strip (attempted, flagged)
    if (!bar.querySelector('.ex-nav')) {
      var i0 = a.ids.indexOf(e.detail.lab.id), nav = document.createElement('div'); nav.className = 'ex-nav'; nav.setAttribute('aria-label', 'Exam questions');
      Promise.all(a.ids.map(function (id) { return KL.labRun(id); })).then(function (runs) {
        nav.innerHTML = (i0 > 0 ? '<a class="ex-np" href="#lab/' + a.ids[i0 - 1] + '" aria-label="Previous question">‹</a>' : '') + a.ids.map(function (id, i) { var tried = (runs[i].hist || []).length > 0; return '<a href="#lab/' + id + '" class="' + (i === i0 ? 'cur ' : '') + (tried ? 'tried ' : '') + (a.flags[id] ? 'flag' : '') + '" title="' + esc(Labs.byId[id].title) + '">' + (i + 1) + '</a>'; }).join('') + (i0 < a.ids.length - 1 ? '<a class="ex-np" href="#lab/' + a.ids[i0 + 1] + '" aria-label="Next question">›</a>' : '');
      });
      bar.insertBefore(nav, $('lrTimer'));
    }
    var t = $('lrTimer'), iv = setInterval(function () { if (!document.body.contains(t) || !S.active) return clearInterval(iv); t.textContent = '⏳ ' + fmt((a.end - Date.now()) / 1000); }, 1000);
  });
})();
