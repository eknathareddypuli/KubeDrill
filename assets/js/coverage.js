/* Coverage: "you have practised N of M competencies" per exam, with gaps and the next lab to close each one. */
(function () {
  'use strict';
  var KL = window.KL, store = KL.store, C = KL.COMP;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function Labs0(id) { return KL.Labs.byId[id]; }
  var NAMES = { CKA: 'Administrator', CKAD: 'Developer', CKS: 'Security' };
  /** a competency is practised once at least one lab that exercises it has been completed */
  function stats(track) {
    var out = { track: track, total: 0, done: 0, nosim: 0, items: [] };
    C.ids(track).forEach(function (id) {
      var labs = C.labsFor(id).filter(function (l) { return KL.Labs.byId[l]; });
      var done = labs.filter(function (l) { return store.labDone(l); });
      var ns = C.nosim[id] && !labs.length;
      var it = { id: id, name: C.meta[id].name, domain: C.meta[id].domain, labs: labs, done: done.length, state: ns ? 'nosim' : done.length ? 'done' : labs.length ? 'open' : 'none', why: C.nosim[id] || '' };
      out.items.push(it); if (ns) out.nosim++; else { out.total++; if (done.length) out.done++; }
    });
    return out;
  }
  function nextLab(it) {
    var ls = it.labs.filter(function (l) { return !store.labDone(l); }).map(function (l) { return KL.Labs.byId[l]; });
    var rank = { Beginner: 0, Intermediate: 1, Advanced: 2, Expert: 3 };
    ls.sort(function (a, b) { return (rank[a.diff] || 0) - (rank[b.diff] || 0); });
    return ls[0];
  }
  KL.coverage = { stats: stats, next: nextLab };
  function meter(s) {
    var pct = s.total ? Math.round(100 * s.done / s.total) : 0;
    return '<div class="cov-meter" role="img" aria-label="' + s.done + ' of ' + s.total + ' competencies"><i style="width:' + pct + '%"></i></div>';
  }
  function render() {
    var root = $('covRoot'); if (!root) return; var tab = render.tab || 'CKA', s = stats(tab);
    var h = '<div class="section-header"><div class="section-tag">Your gaps</div><h2 class="section-title">Competency coverage</h2><p class="section-desc">Every lab is tagged with the skills it exercises. A skill counts as practised once you finish a lab that uses it. Skill lists follow the <b>public</b> CNCF curriculum outlines in our own words; they are not exam questions. Stored only in this browser.</p></div>';
    h += '<div class="cov-tabs" role="tablist">' + ['CKA', 'CKAD', 'CKS'].map(function (t) { var x = stats(t); return '<button role="tab" aria-selected="' + (t === tab) + '" class="cov-tab' + (t === tab ? ' on' : '') + '" data-t="' + t + '"><b>' + t + '</b><span>' + x.done + ' / ' + x.total + '</span></button>'; }).join('') + '</div>';
    h += '<div class="cov-head"><div class="cov-big"><b>' + s.done + '</b><span>of ' + s.total + ' skills practised</span></div>' + meter(s) + '<p class="cov-note">' + (s.nosim ? s.nosim + ' skill' + (s.nosim > 1 ? 's' : '') + ' are excluded because a browser simulator cannot teach them honestly. They are listed below; use a real cluster for those.' : 'Every skill in this track has at least one lab.') + '</p></div>';
    if (KL.readinessHtml) h += KL.readinessHtml(tab);
    var byD = {}; s.items.forEach(function (it) { (byD[it.domain] = byD[it.domain] || []).push(it); });
    Object.keys(byD).forEach(function (d) {
      var its = byD[d], tot = its.filter(function (i) { return i.state !== 'nosim'; }).length, dn = its.filter(function (i) { return i.state === 'done'; }).length;
      h += '<section class="cov-dom"><h3>' + esc(d) + ' <span>' + dn + ' / ' + tot + '</span></h3><ul class="cov-list">' + its.map(function (it) {
        var nl = it.state === 'open' ? nextLab(it) : null, mark = { done: '✓', open: '○', none: '–', nosim: '⛭' }[it.state];
        var act = it.state === 'open' && nl ? '<a class="cov-go" href="#lab/' + nl.id + '">Practise: ' + esc(nl.num) + '</a>' : it.state === 'none' ? '<span class="cov-why">No lab yet</span>' : it.state === 'nosim' ? '<span class="cov-why">Not simulated. ' + esc(it.why) + '</span>' : '<span class="cov-why">' + it.done + ' of ' + it.labs.length + ' labs done</span>';
        return '<li class="cov-' + it.state + '"><span class="cov-mk" aria-hidden="true">' + mark + '</span><span class="cov-nm">' + esc(it.name) + '</span>' + act + '</li>';
      }).join('') + '</ul></section>';
    });
    var wk = KL.design ? KL.design.weakList().filter(function (x) { return x.lab.track.indexOf(tab) >= 0 || (x.lab.variantOf && Labs0(x.lab.variantOf).track.indexOf(tab) >= 0); }).slice(0, 8) : [];
    h += '<section class="cov-dom cov-weak"><h3>Weak spots <span>tasks where you used a hint</span></h3>' + (wk.length ? '<ul class="cov-list">' + wk.map(function (x) { return '<li class="cov-open"><span class="cov-mk" aria-hidden="true">💡</span><span class="cov-nm">' + esc(x.lab.num) + ' · ' + esc(x.task.title.replace(/[`*]/g, '')) + '</span><a class="cov-go" href="#lab/' + x.lab.id + '">Retry (' + x.n + '×)</a></li>'; }).join('') + '</ul>' : '<p class="cov-note">Nothing yet. Tasks where you open a hint will show up here so you can retry them.</p>') + '</section>';
    root.innerHTML = h;
    root.querySelectorAll('.cov-tab').forEach(function (b) { b.onclick = function () { render.tab = b.dataset.t; render(); }; });
  }
  KL.route('coverage', render);
  window.addEventListener('kl:store', function () { if (/^#coverage/.test(location.hash)) render(); });
  // compact meter on the Progress page
  function progressMeter() {
    var root = $('progressRoot'); if (!root || root.querySelector('.cov-mini')) return;
    var box = document.createElement('div'); box.className = 'cov-mini';
    box.innerHTML = '<h3 class="path-h">Competency coverage</h3>' + ['CKA', 'CKAD', 'CKS'].map(function (t) { var s = stats(t); return '<div class="cov-row"><b>' + t + '</b>' + meter(s) + '<span>' + s.done + ' / ' + s.total + '</span></div>'; }).join('') + '<a href="#coverage" class="cov-go">See gaps</a>';
    var anchor = root.querySelector('.pg-grid'); if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling); else root.appendChild(box);
  }
  KL.route('progress', function () { setTimeout(progressMeter, 30); });
})();
