/* Learning-flow touches: track progress rings, mastery map, streak flame, hint slide-in, diff focus slider, typing trail, theme sweep.
   Everything is drawn from data already stored in this browser; CSS/SVG only; inert under reduced motion (the facts are always shown as text too). */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {};
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function off() { return document.documentElement.getAttribute('data-motion') === 'off'; }
  function labs() { return (KL.Labs && KL.Labs.list) || []; }
  function done(id) { try { return KL.store.labDone(id); } catch (e) { return false; } }

  // ── progress rings on the track filters and the path tabs ──
  function ring(pct, txt) {
    var c = 2 * Math.PI * 8, o = c * (1 - pct);
    return '<svg class="vz-ring" width="20" height="20" viewBox="0 0 20 20" role="img" aria-label="' + esc(txt) + '"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="3"/><circle cx="10" cy="10" r="8" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + o.toFixed(2) + '" transform="rotate(-90 10 10)"/></svg>';
  }
  function rings() {
    var L = labs(); if (!L.length) return;
    document.querySelectorAll('#page-labs .filter-btn, #page-path .an-tab').forEach(function (b) {
      var t = b.dataset.vzt || (b.firstChild && b.firstChild.nodeType === 3 ? b.firstChild.textContent.trim() : b.textContent.trim());
      if (['CKA', 'CKAD', 'CKS'].indexOf(t) < 0) return; b.dataset.vzt = t;
      var of = L.filter(function (l) { return (l.track || []).indexOf(t) >= 0; }), n = of.filter(function (l) { return done(l.id); }).length, pct = of.length ? n / of.length : 0;
      var r = b.querySelector('.vz-ring'); var html = ring(pct, t + ': ' + n + ' of ' + of.length + ' labs done');
      if (r) { if (r.getAttribute('aria-label') !== t + ': ' + n + ' of ' + of.length + ' labs done') r.outerHTML = html; } else b.insertAdjacentHTML('beforeend', html);
      b.title = t + ': ' + n + ' of ' + of.length + ' labs done';
    });
  }

  // ── mastery map (one hexagon per exam competency) and streak flame on the progress page ──
  function mastery() {
    var pg = $('page-progress'); if (!pg || !pg.classList.contains('active') || !KL.COMP || !KL.COMP.tree) return;
    var seen = {}, cells = [], tree = KL.COMP.tree;
    Object.keys(tree).forEach(function (tr) { tree[tr].forEach(function (dom) { dom[1].forEach(function (c) { if (seen[c[0]]) return; seen[c[0]] = 1; var ls = KL.COMP.labsFor(c[0]), n = ls.filter(done).length; cells.push({ id: c[0], name: c[1], n: n, t: ls.length, track: tr }); }); }); });
    var sig = cells.map(function (c) { return c.id + c.n; }).join(',') + '|' + (function () { try { return KL.store.streak(); } catch (e) { return 0; } })();
    var host = $('vzMastery'); if (host && host.dataset.sig === sig) return;
    if (!host) { host = document.createElement('section'); host.id = 'vzMastery'; host.className = 'vz-mastery'; pg.appendChild(host); }
    host.dataset.sig = sig; var st = 0; try { st = KL.store.streak(); } catch (e) { /* ignore */ }
    var got = cells.filter(function (c) { return c.t && c.n === c.t; }).length, started = cells.filter(function (c) { return c.n > 0; }).length;
    host.innerHTML = '<h3>Mastery map</h3><p class="vz-sub">' + got + ' of ' + cells.length + ' competencies fully practised, ' + started + ' started. Each cell is one competency; the fill is the share of its labs you have fixed.</p>' +
      '<div class="vz-streak" role="img" aria-label="' + st + '-day streak"><svg width="22" height="26" viewBox="0 0 22 26"><path class="vz-flame" d="M11 1C12 7 18 9 18 16a7 7 0 0 1-14 0c0-3 1.500-5 3-6 0 2 1 3 2 3 0-4 0-8 2-12z" fill="' + (st ? 'var(--warn)' : 'currentColor') + '" fill-opacity="' + (st ? 1 : 0.25) + '"/></svg><b>' + st + '</b> day streak</div>' +
      '<div class="vz-hexes">' + cells.map(function (c) { var f = c.t ? c.n / c.t : 0; return '<span class="vz-hex' + (c.t ? '' : ' none') + '" style="--f:' + f.toFixed(2) + '" title="' + esc(c.track + ' · ' + c.name + ': ' + c.n + ' of ' + c.t + ' labs') + '" role="img" aria-label="' + esc(c.name + ': ' + c.n + ' of ' + c.t + ' labs done') + '"><i></i></span>'; }).join('') + '</div>';
  }

  // ── hint slide-in: only hints that were not on screen before ──
  var hints = {};
  function hintsIn() {
    document.querySelectorAll('.lr-hint').forEach(function (h) { var li = h.closest('li'), k = (li ? li.textContent.slice(0, 24) : '') + '|' + h.textContent.slice(0, 40); if (hints[k]) return; hints[k] = 1; if (!off() && Object.keys(hints).length > 1) { h.classList.add('vz-slide'); setTimeout(function () { h.classList.remove('vz-slide'); }, 300); } });
  }

  // ── diff focus slider on the reading diff pages ──
  function diffSlider() {
    var panes = document.querySelector('.rd-panes'); if (!panes || $('vzDiff')) return;
    var w = document.createElement('label'); w.className = 'vz-diff'; w.innerHTML = '<span>Focus</span> <input type="range" id="vzDiff" min="0" max="2" step="1" value="1" aria-valuetext="both versions"> <em id="vzDiffT">both versions</em>';
    panes.parentNode.insertBefore(w, panes);
    $('vzDiff').oninput = function () { var v = +this.value, t = ['broken version', 'both versions', 'fixed version'][v]; panes.dataset.focus = ['broken', 'both', 'fixed'][v]; this.setAttribute('aria-valuetext', t); $('vzDiffT').textContent = t; };
  }

  // ── typing trail under the drill input: the last keystroke gaps as small bars ──
  function trail() {
    var inp = $('drIn'); if (!inp || inp.dataset.vz) return; inp.dataset.vz = 1;
    var box = document.createElement('div'); box.className = 'vz-trail'; box.setAttribute('aria-hidden', 'true'); box.innerHTML = new Array(16).join('<i></i>');
    inp.parentNode.insertBefore(box, inp.nextSibling); var last = 0, bars = box.children;
    inp.addEventListener('input', function () { var n = Date.now(), gap = last ? Math.min(1, 80 / Math.max(80, n - last)) : 0.5; last = n; box.appendChild(box.firstChild); var b = box.lastChild; b.style.transform = 'scaleY(' + (0.15 + 0.85 * gap).toFixed(2) + ')'; void bars; });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { last = 0; Array.prototype.forEach.call(box.children, function (b) { b.style.transform = ''; }); } });
  }

  // ── theme switch sweep ──
  new MutationObserver(function () {
    if (off()) return; var d = document.createElement('div'); d.className = 'vz-sweep'; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d); setTimeout(function () { d.remove(); }, 380);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  var timer = null;
  function all() { try { rings(); mastery(); hintsIn(); diffSlider(); trail(); } catch (e) { /* a touch must never break the page */ } }
  new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(all, 120); }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', function () { setTimeout(all, 150); });
  window.addEventListener('kl:cmd', function () { setTimeout(all, 150); });
  setTimeout(all, 300);
  KL.touches = { refresh: all };
})();
