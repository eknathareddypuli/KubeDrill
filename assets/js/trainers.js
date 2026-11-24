/* Trainers page (#trainers): weak-spot drills, explain-the-error, documentation search and a study-plan generator.
   Everything runs on this device. Weak spots come from your own quiz and lab records; the plan is a schedule, not a prediction of any result. */
(function () {
  'use strict';
  var KL = window.KL, $ = function (id) { return document.getElementById(id); }, KEY = 'kubedrill:trainers';
  var S = { tab: 'weak', sess: null, plan: null };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pct(x) { return Math.round(x * 100); }
  var TABS = [['weak', 'Weak spots'], ['err', 'Explain the error'], ['docs', 'Docs search'], ['review', 'Lab review'], ['plan', 'Study plan']];

  // ── weak-spot analysis ──
  function quizWeakness() {
    var by = {}; (KL.quizAll || []).filter(function (q) { return q.type === 'mcq'; }).forEach(function (q) {
      var st = KL.store.qState(q.id), c = by[q.cat] = by[q.cat] || { cat: q.cat, n: 0, seen: 0, wrong: 0, due: 0, qs: [] };
      c.n++; c.qs.push(q); if (st) { c.seen += st.seen; c.wrong += st.wrong; if (KL.store.qDue(q.id)) c.due++; }
    });
    return Object.keys(by).map(function (k) { var c = by[k], rate = c.seen ? c.wrong / c.seen : 0.5; c.score = rate * 0.8 + (c.due / c.n) * 0.2 + (c.seen === 0 ? 0.05 : 0); return c; }).sort(function (a, b) { return b.score - a.score; });
  }
  function labWeakness() {
    var out = []; var seen = {};
    ['CKA', 'CKAD', 'CKS'].forEach(function (tr) {
      (KL.COMP.tree[tr] || []).forEach(function (d) { d[1].forEach(function (c) {
        if (seen[c[0]]) return; seen[c[0]] = 1;
        var labs = KL.COMP.labsFor(c[0]).filter(function (id) { return KL.Labs.byId[id]; }); if (!labs.length) return;
        var done = labs.filter(function (id) { return KL.store.labDone(id); }).length, hints = labs.reduce(function (a, id) { return a + KL.store.hintsUsed(id); }, 0);
        out.push({ id: c[0], name: c[1], track: tr, n: labs.length, done: done, hints: hints, labs: labs, score: (labs.length - done) / labs.length * 0.7 + Math.min(1, hints / (labs.length * 3)) * 0.3 });
      }); });
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  }
  function bar(p, cls) { return '<span class="tr-bar"><i class="' + (cls || '') + '" style="width:' + Math.max(2, p) + '%"></i></span>'; }
  function weakHtml() {
    var q = quizWeakness().slice(0, 5), l = labWeakness().slice(0, 5);
    if (S.sess) return sessionHtml();
    var any = KL.Labs.list.some(function (x) { return KL.store.labDone(x.id); }) || Object.keys(KL.store.data().quiz || {}).length;
    return '<div class="tr-card"><h3>Your weakest areas</h3><p class="pro-note">' + (any ? 'Ranked from your own quiz answers and lab records on this device.' : 'You have no records yet, so this starts from areas with no practice. Answer a few questions and it adapts.') + '</p>' +
      '<div class="tr-two"><div><h4>Quiz topics</h4>' + q.map(function (c) { return '<div class="tr-row"><span>' + esc(c.cat) + '</span>' + bar(pct(c.score), 'warn') + '<em>' + (c.seen ? pct(1 - c.wrong / c.seen) + '% right' : 'not tried') + '</em></div>'; }).join('') + '</div>' +
      '<div><h4>Competencies (labs)</h4>' + l.map(function (c) { return '<div class="tr-row"><span>' + esc(c.name) + ' <small>' + c.track + '</small></span>' + bar(pct(c.done / c.n)) + '<em>' + c.done + '/' + c.n + ' labs</em></div>'; }).join('') + '</div></div>' +
      '<p><button class="btn-primary" id="trStart">Start a 10-minute session</button></p><p class="pro-note">Six questions from your weakest topics (overdue and missed first), then one lab to try next. Answers feed the same spaced-repetition record as the Quiz.</p></div>';
  }
  function startSession() {
    var wk = quizWeakness().slice(0, 3), pool = [];
    wk.forEach(function (c) { var qs = c.qs.slice().sort(function (a, b) { var sa = KL.store.qState(a.id), sb = KL.store.qState(b.id); var ra = sa ? (KL.store.qDue(a.id) ? 2 : 0) + (sa.ok ? 0 : 1) : 1, rb = sb ? (KL.store.qDue(b.id) ? 2 : 0) + (sb.ok ? 0 : 1) : 1; return rb - ra || Math.random() - 0.5; }); pool = pool.concat(qs.slice(0, 3)); });
    var qs = shuffle(pool).slice(0, 6), lw = labWeakness(), pick = null, rank = { Beginner: 0, Intermediate: 1, Advanced: 2, Expert: 3 };
    for (var i = 0; i < lw.length && !pick; i++) { var cand = lw[i].labs.filter(function (id) { return !KL.store.labDone(id); }).sort(function (a, b) { return (rank[KL.Labs.byId[a].diff] || 0) - (rank[KL.Labs.byId[b].diff] || 0); })[0]; if (cand) pick = { id: cand, comp: lw[i].name }; }
    S.sess = { qs: qs, i: 0, ok: 0, picked: null, lab: pick };
  }
  function sessionHtml() {
    var s = S.sess;
    if (s.i >= s.qs.length) {
      var lab = s.lab && KL.Labs.byId[s.lab.id];
      return '<div class="tr-card"><h3>Session done: ' + s.ok + ' of ' + s.qs.length + ' right</h3>' + (lab ? '<p>Next lab for <b>' + esc(s.lab.comp) + '</b>: <a href="#lab/' + lab.id + '">' + esc(lab.num + ' ' + lab.title) + '</a> (' + esc(lab.diff) + ', ' + esc(lab.time) + ').</p>' : '<p>You have finished every lab in your weakest areas.</p>') +
        '<p><button class="btn-primary" id="trAgain">Another session</button> <button class="btn-secondary" id="trBack">Back to weak spots</button></p></div>';
    }
    var q = s.qs[s.i], a = s.picked;
    return '<div class="tr-card"><div class="tr-meta">Question ' + (s.i + 1) + ' of ' + s.qs.length + ' · ' + esc(q.cat) + '</div><h3 class="tr-q">' + esc(q.q) + '</h3><div class="tr-opts">' + q.opts.map(function (o, k) {
      var cls = a === null ? '' : (k === q.ans ? ' good' : (k === a ? ' bad' : ' dim')); return '<button class="tr-opt' + cls + '" data-k="' + k + '"' + (a !== null ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>' +
      (a !== null ? '<p class="tr-exp" role="status"><b>' + (a === q.ans ? 'Right.' : 'Not quite.') + '</b> ' + esc(q.exp || '') + '</p><p><button class="btn-primary" id="trNext">' + (s.i + 1 < s.qs.length ? 'Next' : 'Finish') + '</button></p>' : '') + '</div>';
  }
  function bindWeak() {
    var st = $('trStart'); if (st) st.onclick = function () { startSession(); draw(); };
    document.querySelectorAll('.tr-opt').forEach(function (b) { b.onclick = function () { var s = S.sess, q = s.qs[s.i]; s.picked = +b.dataset.k; var ok = s.picked === q.ans; if (ok) s.ok++; KL.store.qRecord(q.id, ok); draw(); var nx = $('trNext'); if (nx) nx.focus(); }; });
    var nx = $('trNext'); if (nx) nx.onclick = function () { S.sess.i++; S.sess.picked = null; draw(); };
    var ag = $('trAgain'); if (ag) ag.onclick = function () { startSession(); draw(); };
    var bk = $('trBack'); if (bk) bk.onclick = function () { S.sess = null; draw(); };
  }

  // ── multiple-choice trainers (errors and docs) ──
  function mcHtml(kind) {
    var data = kind === 'err' ? KL.errTrainer : KL.docsTrainer, key = 'run_' + kind, r = S[key];
    if (!r) { var d = load(), wrong = (d[kind + 'Wrong'] || []), order = shuffle(data).sort(function (a, b) { return (wrong.indexOf(b[0]) >= 0 ? 1 : 0) - (wrong.indexOf(a[0]) >= 0 ? 1 : 0); }).slice(0, 8);
      return '<div class="tr-card"><h3>' + (kind === 'err' ? 'Explain the error' : 'Docs search') + '</h3><p class="pro-note">' + (kind === 'err' ? 'A real-looking error message, four possible readings. The skill is to say which layer printed it and what to check first. ' + data.length + ' messages; ones you missed come back first.' : 'You have a task and the Kubernetes docs open. Which section holds the answer? Page titles can move: search by keyword if one has. ' + data.length + ' tasks.') + '</p><p><button class="btn-primary" id="mcGo">Start 8 questions</button></p>' + (kind === 'docs' ? '<p class="pro-note">For timed lookups of single fields, use the <a href="#drills">doc races on Drills</a>.</p>' : '') + '</div>' + '<div hidden id="mcOrder">' + esc(JSON.stringify(order.map(function (x) { return x[0]; }))) + '</div>'; }
    var it = data.filter(function (x) { return x[0] === r.ids[r.i]; })[0];
    if (!it) { return '<div class="tr-card"><h3>Done: ' + r.ok + ' of ' + r.ids.length + ' right</h3><p><button class="btn-primary" id="mcAgain">Another round</button></p></div>'; }
    var errish = kind === 'err', opts = errish ? it[3] : it[2], ans = errish ? it[4] : it[3], exp = errish ? it[5] : it[4], a = r.picked;
    return '<div class="tr-card"><div class="tr-meta">' + (r.i + 1) + ' of ' + r.ids.length + '</div>' + (errish ? '<pre class="tr-err">' + esc(it[1]) + '</pre><h3 class="tr-q">' + esc(it[2]) + '</h3>' : '<h3 class="tr-q">' + esc(it[1]) + '</h3>') + '<div class="tr-opts">' + opts.map(function (o, k) {
      var cls = a === null ? '' : (k === ans ? ' good' : (k === a ? ' bad' : ' dim')); return '<button class="tr-opt' + cls + '" data-k="' + k + '"' + (a !== null ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>' +
      (a !== null ? '<p class="tr-exp" role="status"><b>' + (a === ans ? 'Right.' : 'Not quite.') + '</b> ' + esc(exp) + (errish ? ' <a href="#decode">Open the error decoder</a>.' : '') + '</p><p><button class="btn-primary" id="mcNext">' + (r.i + 1 < r.ids.length ? 'Next' : 'Finish') + '</button></p>' : '') + '</div>';
  }
  function bindMc(kind) {
    var data = kind === 'err' ? KL.errTrainer : KL.docsTrainer, key = 'run_' + kind;
    var go = $('mcGo'); if (go) go.onclick = function () { var ids = JSON.parse($('mcOrder').textContent); S[key] = { ids: ids, i: 0, ok: 0, picked: null }; draw(); };
    var ag = $('mcAgain'); if (ag) ag.onclick = function () { S[key] = null; draw(); };
    document.querySelectorAll('.tr-opt').forEach(function (b) { b.onclick = function () { var r = S[key], it = data.filter(function (x) { return x[0] === r.ids[r.i]; })[0], ans = kind === 'err' ? it[4] : it[3]; r.picked = +b.dataset.k; var ok = r.picked === ans; if (ok) r.ok++;
      var d = load(), w = d[kind + 'Wrong'] || []; w = w.filter(function (x) { return x !== it[0]; }); if (!ok) w.push(it[0]); d[kind + 'Wrong'] = w; save(d); KL.store.touchDay(); draw(); var nx = $('mcNext'); if (nx) nx.focus(); }; });
    var nx = $('mcNext'); if (nx) nx.onclick = function () { S[key].i++; S[key].picked = null; draw(); };
  }

  // ── study plan ──
  function dayKey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parseDay(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function minutesOf(lab) { return parseInt(lab.time, 10) || 12; }
  function buildPlan(o) {
    var today = parseDay(dayKey(new Date())), exam = parseDay(o.date), total = Math.round((exam - today) / 86400000);
    if (!(total >= 5)) return { error: 'The exam date must be at least 5 days away.' };
    total = Math.min(total, 150); var perDay = Math.max(25, Math.round(o.hours * 60 / 6));
    var rank = { Beginner: 0, Intermediate: 1, Advanced: 2, Expert: 3 }, lvlShift = { new: 0, some: 1, exp: 2 }[o.level] || 0;
    var domains = (KL.COMP.tree[o.track] || []).map(function (d) { return { name: d[0], labs: [].concat.apply([], d[1].map(function (c) { return KL.COMP.labsFor(c[0]); })).filter(function (id, i, a) { var l = KL.Labs.byId[id]; return l && a.indexOf(id) === i && l.track.indexOf(o.track) >= 0 && l.id.indexOf('capstone') < 0 && !/CAPSTONE/.test(l.title); }) }; }).filter(function (d) { return d.labs.length; });
    var queue = []; var maxLen = Math.max.apply(null, domains.map(function (d) { return d.labs.length; }).concat(1));
    domains.forEach(function (d) { d.labs.sort(function (a, b) { return Math.abs((rank[KL.Labs.byId[a].diff] || 0) - lvlShift - 0.5) - Math.abs((rank[KL.Labs.byId[b].diff] || 0) - lvlShift - 0.5); }); });
    for (var i = 0; i < maxLen; i++) domains.forEach(function (d) { if (d.labs[i] && !KL.store.labDone(d.labs[i])) queue.push(d.labs[i]); });
    var mocks = (KL.exam && KL.exam.bundles ? KL.exam.bundles() : []).filter(function (b) { return b.track === o.track; });
    var full = mocks.filter(function (b) { return !b.level; }), lvls = mocks.filter(function (b) { return b.level; });
    var days = [], mockStart = Math.max(1, total - Math.max(3, Math.round(total * 0.12))), qi = 0, weakCats = quizWeakness().slice(0, 4).map(function (c) { return c.cat; });
    for (var d = 0; d < total; d++) {
      var date = new Date(today.getTime() + d * 86400000), items = [], left = perDay, dow = date.getDay();
      var rest = (d % 7 === 6) || d === total - 1;
      if (d === total - 1) { items.push({ t: 'rest', label: 'Day before the exam: light review of the cheatsheet, set up your terminal habits, sleep.', mins: 20 }); }
      else if (rest) { items.push({ t: 'rest', label: 'Rest day. A 10-minute flashcard round is enough.', href: '#quiz', mins: 10 }); }
      else if (d >= mockStart) {
        var k = d - mockStart, m = full[k % Math.max(1, full.length)] || lvls[lvls.length - 1];
        if (m && k % 2 === 0) items.push({ t: 'mock', label: m.name + ' under exam rules', href: '#exam', mins: Math.min(m.mins, Math.max(60, perDay)) });
        else items.push({ t: 'review', label: 'Review every task you missed in the last mock, then redo it from scratch.', href: '#labs', mins: perDay });
      } else {
        var phase = d / mockStart;
        if (phase < 0.2 && d === 0) items.push({ t: 'doc', label: 'Set up: aliases, vim, kubectl explain, and the docs search trainer.', href: '#trainers', mins: 25 }), left -= 25;
        while (left > 0 && queue.length) { var id = queue[0], lab = KL.Labs.byId[id], mm = minutesOf(lab); if (items.length && mm > left + 8) break; queue.shift(); items.push({ t: 'lab', id: id, label: lab.num + ' ' + lab.title, href: '#lab/' + id, mins: mm }); left -= mm; }
        if (left >= 10) { var cat = weakCats[qi++ % Math.max(1, weakCats.length)]; items.push({ t: 'drill', label: phase < 0.5 ? 'Quiz round: ' + (cat || 'mixed topics') : 'Weak-spot session on the Trainers page', href: phase < 0.5 ? '#quiz' : '#trainers', mins: Math.min(20, left) }); }
        if (!items.length) items.push({ t: 'drill', label: 'Command drills', href: '#drills', mins: perDay });
      }
      days.push({ date: dayKey(date), items: items });
    }
    return { created: dayKey(new Date()), track: o.track, exam: o.date, hours: o.hours, level: o.level, days: days, labsLeft: queue.length };
  }
  function planHtml() {
    var d = load(), p = S.plan = S.plan || d.plan || null, o = d.planOpts || { track: 'CKA', hours: 8, level: 'some', date: dayKey(new Date(Date.now() + 56 * 86400000)) };
    var form = '<div class="tr-card"><h3>Study plan</h3><p class="pro-note">A day-by-day schedule built from the labs, quizzes and mocks in this app. Six study days a week, one rest day. It is a schedule, not a promise about any result.</p><div class="tr-form">' +
      '<label>Exam <select id="plTrack">' + ['CKA', 'CKAD', 'CKS'].map(function (t) { return '<option' + (o.track === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
      '<label>Exam date <input type="date" id="plDate" value="' + esc(o.date) + '"></label>' +
      '<label>Hours per week <input type="number" id="plHours" min="2" max="40" value="' + o.hours + '"></label>' +
      '<label>Experience <select id="plLevel"><option value="new"' + (o.level === 'new' ? ' selected' : '') + '>New to Kubernetes</option><option value="some"' + (o.level === 'some' ? ' selected' : '') + '>Some hands-on</option><option value="exp"' + (o.level === 'exp' ? ' selected' : '') + '>Use it at work</option></select></label>' +
      '<button class="btn-primary" id="plGo">' + (p ? 'Rebuild plan' : 'Build my plan') + '</button></div><p id="plErr" class="tr-bad" role="alert"></p></div>';
    if (!p) return form;
    var done = d.planDone || {}, todayK = dayKey(new Date()), tot = 0, dn = 0;
    p.days.forEach(function (dy, di) { dy.items.forEach(function (it, ii) { tot++; if (done[di + ':' + ii] || (it.t === 'lab' && KL.store.labDone(it.id))) dn++; }); });
    var wk = '', weeks = Math.ceil(p.days.length / 7);
    for (var w = 0; w < weeks; w++) {
      wk += '<details class="tr-week"' + (p.days.slice(w * 7, w * 7 + 7).some(function (x) { return x.date === todayK; }) || (w === 0 && todayK > p.days[p.days.length - 1].date) ? ' open' : (w === 0 ? ' open' : '')) + '><summary>Week ' + (w + 1) + '</summary>' + p.days.slice(w * 7, w * 7 + 7).map(function (dy, k) {
        var di = w * 7 + k; return '<div class="tr-day' + (dy.date === todayK ? ' today' : '') + '"><b>' + esc(parseDay(dy.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })) + (dy.date === todayK ? ' · today' : '') + '</b><ul>' + dy.items.map(function (it, ii) {
          var ck = done[di + ':' + ii] || (it.t === 'lab' && KL.store.labDone(it.id)); return '<li><label><input type="checkbox" data-pk="' + di + ':' + ii + '"' + (ck ? ' checked' : '') + '> ' + (it.href ? '<a href="' + esc(it.href) + '">' + esc(it.label) + '</a>' : esc(it.label)) + ' <small>' + it.mins + ' min</small></label></li>'; }).join('') + '</ul></div>'; }).join('') + '</details>';
    }
    return form + '<div class="tr-card"><h3>' + esc(p.track) + ' plan: ' + p.days.length + ' days to ' + esc(p.exam) + '</h3><p>' + dn + ' of ' + tot + ' items done ' + bar(pct(dn / Math.max(1, tot))) + '</p>' + (p.labsLeft ? '<p class="pro-note">' + p.labsLeft + ' labs for this track did not fit before the exam; more hours a week would fit them.</p>' : '') +
      '<p><button class="btn-secondary" id="plCopy">Copy as text</button> <button class="btn-secondary" id="plPrint">Print</button></p>' + wk + '</div>';
  }
  function planText(p) { return p.track + ' study plan, exam ' + p.exam + '\n\n' + p.days.map(function (dy) { return dy.date + '\n' + dy.items.map(function (it) { return '  - ' + it.label + ' (' + it.mins + ' min)'; }).join('\n'); }).join('\n'); }
  function bindPlan() {
    var go = $('plGo'); if (go) go.onclick = function () {
      var o = { track: $('plTrack').value, date: $('plDate').value, hours: Math.max(2, Math.min(40, +$('plHours').value || 8)), level: $('plLevel').value };
      var p = buildPlan(o); if (p.error) { $('plErr').textContent = p.error; return; }
      var d = load(); d.plan = p; d.planOpts = o; d.planDone = {}; save(d); S.plan = p; draw();
    };
    document.querySelectorAll('[data-pk]').forEach(function (c) { c.onchange = function () { var d = load(); d.planDone = d.planDone || {}; if (c.checked) d.planDone[c.dataset.pk] = 1; else delete d.planDone[c.dataset.pk]; save(d); KL.store.touchDay(); }; });
    var cp = $('plCopy'); if (cp) cp.onclick = function () { var t = planText(S.plan); try { navigator.clipboard.writeText(t); cp.textContent = 'Copied'; } catch (e) { cp.textContent = 'Copy failed'; } };
    var pr = $('plPrint'); if (pr) pr.onclick = function () { document.querySelectorAll('.tr-week').forEach(function (x) { x.open = true; }); window.print(); };
  }

  function draw() {
    var root = $('trRoot'); if (!root) return;
    var body = S.tab === 'weak' ? weakHtml() : S.tab === 'plan' ? planHtml() : S.tab === 'review' ? (KL.labReview ? KL.labReview.html() : '') : mcHtml(S.tab);
    root.innerHTML = '<div class="section-header"><div class="section-tag">Practice</div><h2 class="section-title">Trainers</h2><p class="section-desc">Four short trainers aimed at how people actually lose points: weak topics, misread errors, slow docs lookups and an unplanned calendar.</p></div>' +
      '<div class="an-tabs tr-tabs" role="tablist">' + TABS.map(function (t) { return '<button class="an-tab' + (S.tab === t[0] ? ' active' : '') + '" role="tab" aria-selected="' + (S.tab === t[0]) + '" data-t="' + t[0] + '">' + t[1] + (t[0] === 'review' && KL.labReview && KL.labReview.due().length ? ' (' + KL.labReview.due().length + ')' : '') + '</button>'; }).join('') + '</div>' + body;
    root.querySelectorAll('.tr-tabs .an-tab').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.t; draw(); }; });
    if (S.tab === 'weak') bindWeak(); else if (S.tab === 'plan') bindPlan(); else if (S.tab === 'review') { /* links only */ } else bindMc(S.tab);
  }
  KL.route('trainers', draw);
  KL.trainers = { buildPlan: buildPlan, quizWeakness: quizWeakness, labWeakness: labWeakness };
})();
