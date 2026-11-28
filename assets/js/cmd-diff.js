/* "What your commands changed": after a pass, compares the cluster as the lab set it up with the cluster as you left it, object by object,
   and lets you step through the changes with a slider. It reads state already in this browser and sends nothing anywhere.
   Steps are grouped by object, not in the order you typed the commands. Pods, ReplicaSets and endpoints that controllers made as a result are counted separately. */
(function () {
  'use strict';
  var KL = window.KL;
  var SKIPK = { status: 1, resourceVersion: 1, uid: 1, creationTimestamp: 1, generation: 1, managedFields: 1, ownerReferences: 1, selfLink: 1, deletionTimestamp: 1 };
  var EFFECT = { Pod: 1, ReplicaSet: 1, Endpoints: 1, EndpointSlice: 1, Event: 1, ControllerRevision: 1, Lease: 1, Node: 1 };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function flat(o, p, out, d) {
    if (d > 9) { out[p] = '…'; return out; }
    if (o === null || typeof o !== 'object') { out[p] = String(o); return out; }
    var ks = Array.isArray(o) ? o.map(function (_, i) { return i; }) : Object.keys(o);
    if (!ks.length) { out[p] = Array.isArray(o) ? '[]' : '{}'; return out; }
    ks.forEach(function (k) { if (!Array.isArray(o) && SKIPK[k]) return; flat(o[k], p ? p + (Array.isArray(o) ? '[' + k + ']' : '.' + k) : String(k), out, d + 1); });
    return out;
  }
  function idOf(o) { return (o.kind || '?') + '/' + ((o.metadata && o.metadata.name) || '?') + ((o.metadata && o.metadata.namespace) ? ' (' + o.metadata.namespace + ')' : ''); }
  function view(o) { var c = { metadata: { labels: o.metadata && o.metadata.labels, annotations: o.metadata && o.metadata.annotations }, spec: o.spec, data: o.data, stringData: o.stringData, rules: o.rules, subjects: o.subjects, roleRef: o.roleRef, binding: o.binding }; return flat(c, '', {}, 0); }
  function short(v) { v = String(v); return v.length > 46 ? v.slice(0, 43) + '…' : v; }
  function diff(before, after) {
    var changes = [], effects = { added: 0, removed: 0, changed: 0 }, k;
    for (k in after) {
      var a = after[k], b = before[k]; if (!a || !a.kind) continue;
      if (!b) { if (EFFECT[a.kind]) effects.added++; else changes.push({ t: '+', id: idOf(a), d: [] }); continue; }
      var fa = view(a), fb = view(b), ds = [];
      Object.keys(fa).forEach(function (p) { if (fb[p] === undefined) ds.push(['+', p, '', fa[p]]); else if (fb[p] !== fa[p]) ds.push(['~', p, fb[p], fa[p]]); });
      Object.keys(fb).forEach(function (p) { if (fa[p] === undefined) ds.push(['-', p, fb[p], '']); });
      if (ds.length) { if (EFFECT[a.kind]) effects.changed++; else changes.push({ t: '~', id: idOf(a), d: ds }); }
    }
    for (k in before) { if (!after[k] && before[k] && before[k].kind) { if (EFFECT[before[k].kind]) effects.removed++; else changes.push({ t: '-', id: idOf(before[k]), d: [] }); } }
    var order = { '+': 0, '~': 1, '-': 2 }; changes.sort(function (x, y) { return order[x.t] - order[y.t] || (x.id < y.id ? -1 : 1); });
    return { changes: changes, effects: effects };
  }
  function before(lab) { var s = new KL.Sim(); KL.Labs.setup(s, lab); s.settle(20); return s.objs; }
  function html(res) {
    var n = res.changes.length, ef = res.effects, sideTxt = (ef.added || ef.removed || ef.changed) ? '<p class="cd-fx">Side effects made by controllers: ' + ef.added + ' created, ' + ef.changed + ' updated, ' + ef.removed + ' removed (pods, ReplicaSets, endpoints).</p>' : '';
    if (!n) return '<h4>🔍 What your commands changed</h4><p>No configuration objects differ from the starting state' + (ef.added || ef.removed || ef.changed ? ', only controller side effects.' : '.') + '</p>' + sideTxt;
    var rows = res.changes.map(function (c, i) {
      var sym = { '+': '＋', '~': '≈', '-': '－' }[c.t], word = { '+': 'created', '~': 'changed', '-': 'deleted' }[c.t];
      var det = c.d.slice(0, 5).map(function (x) { return '<li><code>' + esc(x[1]) + '</code> ' + (x[0] === '+' ? '→ <b>' + esc(short(x[3])) + '</b> (added)' : x[0] === '-' ? '<s>' + esc(short(x[2])) + '</s> (removed)' : '<s>' + esc(short(x[2])) + '</s> → <b>' + esc(short(x[3])) + '</b>') + '</li>'; }).join('') + (c.d.length > 5 ? '<li>…and ' + (c.d.length - 5) + ' more fields</li>' : '');
      return '<li class="cd-row cd-' + { '+': 'add', '~': 'chg', '-': 'del' }[c.t] + '" data-i="' + (i + 1) + '"><span class="cd-sym" aria-hidden="true">' + sym + '</span><span><b>' + esc(c.id) + '</b> <em>' + word + '</em>' + (det ? '<ul>' + det + '</ul>' : '') + '</span></li>';
    }).join('');
    return '<h4>🔍 What your commands changed</h4><div class="cd-scrub"><span>Before</span><input type="range" id="cdRange" min="0" max="' + n + '" value="' + n + '" aria-label="Step through the changes: 0 is the starting cluster, ' + n + ' is how you left it"><span>After</span></div><p class="cd-cap" id="cdCap" aria-live="polite"></p><ol class="cd-list" id="cdList">' + rows + '</ol>' + sideTxt + '<small>Grouped by object, not in the order you typed. Fields shown are spec, data, labels and annotations.</small>';
  }
  function bind(el, res) {
    var rg = el.querySelector('#cdRange'); if (!rg) return; var n = res.changes.length;
    function show(v) { v = +v; el.querySelectorAll('.cd-row').forEach(function (li) { li.classList.toggle('cd-on', +li.dataset.i <= v); li.classList.toggle('cd-cur', +li.dataset.i === v && v > 0); });
      var c = res.changes[v - 1]; el.querySelector('#cdCap').textContent = v === 0 ? 'Starting cluster: none of your changes applied.' : v === n ? 'Final cluster, as you left it (' + n + ' object' + (n === 1 ? '' : 's') + ' changed).' : 'Applied ' + v + ' of ' + n + ': ' + c.id; }
    rg.oninput = function () { show(rg.value); }; show(n);
  }
  function render(lab, sim) {
    var fb = document.getElementById('lrFeedback'); if (!fb) return null;
    var res; try { res = diff(before(lab), sim.objs); } catch (e) { return null; }
    var old = document.getElementById('lrDiff'); if (old) old.remove();
    var el = document.createElement('div'); el.id = 'lrDiff'; el.className = 'lf-cmp lr-diff'; el.innerHTML = html(res);
    var anchor = document.getElementById('lrBench') || fb; anchor.parentNode.insertBefore(el, anchor.nextSibling); bind(el, res); return res;
  }
  window.addEventListener('kl:labdone', function (e) {
    var d = e.detail || {}; if (!d.lab || d.mode === 'exam') return;
    setTimeout(function () { try { Promise.resolve(KL.labRun(d.lab.id)).then(function (run) { if (run && run.sim) render(run.lab || d.lab, run.sim); }); } catch (x) {} }, 260);
  });
  KL.cmdDiff = { diff: diff, before: before, render: render, view: view };
})();
