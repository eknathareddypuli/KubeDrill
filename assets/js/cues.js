/* Motion cues, part 3: check-button states, error-line emphasis, celebration toggle, review dots, flashcard swipe, quiz reveal and order glide,
   a drag scrubber for the Visualize player, and two teaching scenes (probe heartbeat, quota gauges).
   Every cue is added after the real result is on screen, has a text equivalent, and is inert under html[data-motion=off]. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {};
  function $(i) { return document.getElementById(i); }
  function off() { return document.documentElement.getAttribute('data-motion') === 'off'; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  // ── 6. check button: working, passed, failed (text changes too, not only colour) ──
  var chkT = null;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#lrCheck'); if (!b) return;
    if (!b.dataset.lbl) b.dataset.lbl = b.textContent; b.dataset.st = 'run'; b.textContent = 'Checking…';
  }, true);
  window.addEventListener('kl:check', function (e) {
    var b = $('lrCheck'); if (!b) return; var r = e.detail && e.detail.res; if (!r) return; if (!b.dataset.lbl) b.dataset.lbl = b.textContent;
    b.dataset.st = r.ok ? 'ok' : 'bad'; b.textContent = r.ok ? '✓ All tasks pass' : '✗ ' + (r.total - r.passed) + ' still failing';
    clearTimeout(chkT); chkT = setTimeout(function () { b.dataset.st = ''; b.textContent = b.dataset.lbl; }, off() ? 1500 : 1800);
  });

  // ── 13. error lines in the terminal get a marker and a short slide-in ──
  var ERR = /^(Error|error:|Unable to|Warning|The .* is invalid|Forbidden|Back-off|Failed|\w+: command not found)/m;
  function markErr(o) { if (o.nodeType === 1 && o.classList.contains('lr-o') && !o.dataset.er && ERR.test(o.textContent)) { o.dataset.er = '1'; o.classList.add('ln-err'); } }
  function watchOut() { var o = $('lrOut'); if (!o || o.dataset.w) return; o.dataset.w = '1'; Array.prototype.forEach.call(o.children, markErr); new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, markErr); }); }).observe(o, { childList: true }); }
  window.addEventListener('kl:runner', function () { setTimeout(watchOut, 80); setTimeout(addCele, 120); });

  // ── 8. celebration on a pass, with its own switch ──
  function cele() { return ls('kubedrill:celebrate') !== 'off'; }
  function wrapFx() { if (!KL.fx || !KL.fx.confetti || KL.fx.confetti._w) return; var o = KL.fx.confetti; KL.fx.confetti = function () { if (!cele() || off()) return; return o.apply(this, arguments); }; KL.fx.confetti._w = 1; }
  wrapFx(); window.addEventListener('DOMContentLoaded', wrapFx);
  function addCele() {
    var bar = document.querySelector('.lr-bar'); if (!bar || $('lrCele')) return; var b = document.createElement('button'); b.type = 'button'; b.id = 'lrCele'; b.className = 'btn-secondary';
    function set() { b.setAttribute('aria-pressed', String(cele())); b.textContent = cele() ? '🎉 Celebrate: on' : '🎉 Celebrate: off'; b.title = 'Confetti when you pass a lab'; }
    b.onclick = function () { ls('kubedrill:celebrate', cele() ? 'off' : 'on'); set(); }; set(); bar.appendChild(b);
  }

  // ── 9. review dots: four steps (3, 7, 21, 60 days), filled as the lab is passed again ──
  window.addEventListener('kl:labdone', function (e) {
    var d = e.detail || {}; if (!d.lab || !KL.labReview) return;
    setTimeout(function () {
      var card = $('lrBench'); if (!card || card.querySelector('.rv-dots')) return; var o = KL.labReview.data()[d.lab.variantOf || d.lab.id]; if (!o) return;
      var n = Math.min(4, o.stage || 0), h = '<div class="rv-dots" role="img" aria-label="Review steps done: ' + n + ' of 4 (3, 7, 21 and 60 days)">' + [3, 7, 21, 60].map(function (dd, i) { return '<span class="rv-dot' + (i < n ? ' on' : '') + (i === n - 1 ? ' new' : '') + '" title="' + dd + ' days"></span>'; }).join('') + '<small> ' + n + ' of 4 review steps</small></div>';
      card.insertAdjacentHTML('beforeend', h);
    }, 260);
  });

  // ── 20. quiz: the explanation slides in once the answer is locked; 21. order-the-steps: placed steps glide in ──
  function watchQuiz() {
    var ex = $('quizExplain'); if (ex && !ex.dataset.w) { ex.dataset.w = '1'; new MutationObserver(function () { if (ex.textContent.trim() && !off()) { ex.classList.remove('qx-in'); void ex.offsetWidth; ex.classList.add('qx-in'); } }).observe(ex, { childList: true, subtree: true }); }
  }
  new MutationObserver(function () { watchQuiz(); }).observe(document.body, { childList: true, subtree: true });

  // ── 19. flashcard: drag sideways. Past 80 px a flipped card is graded (right = knew it, left = missed it); an unflipped card flips ──
  var drag = null;
  document.addEventListener('pointerdown', function (e) { var c = e.target.closest && e.target.closest('#fcCard'); if (!c || e.button) return; drag = { c: c, x: e.clientX, dx: 0, moved: false }; });
  document.addEventListener('pointermove', function (e) {
    if (!drag) return; drag.dx = e.clientX - drag.x; if (Math.abs(drag.dx) > 6) drag.moved = true; if (!drag.moved || off()) return;
    drag.c.style.transition = 'none'; drag.c.style.transform = 'translateX(' + drag.dx + 'px) rotate(' + (drag.dx / 30) + 'deg)';
  });
  function endDrag() {
    if (!drag) return; var d = drag; drag = null; if (!d.moved) return; d.c.style.transition = ''; d.c.style.transform = ''; d.c.dataset.swiped = '1'; setTimeout(function () { delete d.c.dataset.swiped; }, 80);
    if (Math.abs(d.dx) < 80) return;
    if (d.c.getAttribute('aria-pressed') === 'true') { var b = $(d.dx > 0 ? 'fcYes' : 'fcNo'); if (b) b.click(); } else { d.c.dataset.force = '1'; d.c.click(); delete d.c.dataset.force; }
  }
  document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', function () { if (drag) { drag.c.style.transition = ''; drag.c.style.transform = ''; drag = null; } });
  document.addEventListener('click', function (e) { var c = e.target.closest && e.target.closest('#fcCard'); if (c && c.dataset.swiped && !c.dataset.force) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  // ── scenes for the Visualize page ──
  function chip(l, c) { return '<div class="cp-it ' + (c || '') + '">' + l + '</div>'; }
  KL.scenes = {
    probes: { title: '💓 Probes', steps: [
      { cap: '<b>Startup probe</b> runs first and alone. Until it succeeds once, liveness and readiness do not run, so a slow starter is not killed.', beat: 0, lane: ['run', 'idle', 'idle'], txt: 'startup: checking · readiness: waiting · liveness: waiting' },
      { cap: '<b>Startup succeeded.</b> The other two probes now start. The pod is still not Ready.', beat: 1, lane: ['ok', 'run', 'run'], txt: 'startup: passed · readiness: checking · liveness: checking' },
      { cap: '<b>Readiness passes.</b> The pod joins the Service endpoints and receives traffic.', beat: 2, lane: ['ok', 'ok', 'run'], txt: 'startup: passed · readiness: passing (in endpoints) · liveness: checking' },
      { cap: '<b>Readiness fails.</b> The pod leaves the endpoints but is <i>not</i> restarted. It is simply taken out of rotation.', beat: 3, lane: ['ok', 'bad', 'run'], txt: 'readiness: failing (removed from endpoints) · liveness: still passing' },
      { cap: '<b>Liveness fails</b> failureThreshold times in a row. The kubelet kills and restarts the container.', beat: 4, lane: ['ok', 'bad', 'bad'], txt: 'liveness: failing → container restarted' }] ,
      render: function (st, s) { var N = ['startup', 'readiness', 'liveness']; st.innerHTML = '<div class="sc-probes">' + N.map(function (n, i) { var k = s.lane[i]; return '<div class="sc-lane ' + k + '"><span class="sc-n">' + n + '</span><span class="sc-heart' + (k === 'run' || k === 'ok' ? ' beat' : '') + '" aria-hidden="true">' + (k === 'bad' ? '✕' : k === 'ok' ? '♥' : k === 'run' ? '♡' : '·') + '</span><span class="sc-s">' + ({ idle: 'waiting', run: 'checking', ok: 'passing', bad: 'failing' })[k] + '</span></div>'; }).join('') + '</div>'; } },
    quota: { title: '📏 Quota', steps: [
      { cap: 'A ResourceQuota sets a hard ceiling for a namespace. Nothing is used yet.', g: [['pods', 0, 10], ['requests.cpu (m)', 0, 2000], ['requests.memory (Mi)', 0, 4096]] },
      { cap: 'Three pods are admitted. Each request counts against the ceiling, whether or not the pod uses it.', g: [['pods', 3, 10], ['requests.cpu (m)', 750, 2000], ['requests.memory (Mi)', 1536, 4096]] },
      { cap: 'Six pods: CPU is at 90%. Memory still has room, but the first resource to run out decides.', g: [['pods', 6, 10], ['requests.cpu (m)', 1800, 2000], ['requests.memory (Mi)', 3072, 4096]] },
      { cap: 'The next pod asks for 500m CPU. 1800 + 500 is over 2000, so the API server rejects it with <code>exceeded quota</code>. The message names the resource.', g: [['pods', 6, 10], ['requests.cpu (m)', 1800, 2000, 500], ['requests.memory (Mi)', 3072, 4096]] }],
      render: function (st, s) { st.innerHTML = '<div class="sc-gauges">' + s.g.map(function (g) { var u = g[1] / g[2] * 100, add = g[3] ? g[3] / g[2] * 100 : 0, over = g[3] && g[1] + g[3] > g[2]; return '<div class="sc-g"><div class="sc-gl"><b>' + g[0] + '</b><span>' + g[1] + ' / ' + g[2] + (g[3] ? ' (+' + g[3] + ' requested' + (over ? ': over the limit' : '') + ')' : '') + '</span></div><div class="sc-bar" role="meter" aria-valuemin="0" aria-valuemax="' + g[2] + '" aria-valuenow="' + g[1] + '"><i class="' + (u > 85 ? 'hi' : '') + '" style="width:' + u + '%"></i>' + (add ? '<i class="add' + (over ? ' over' : '') + '" style="left:' + u + '%;width:' + Math.min(add, 100 - u + 8) + '%"></i>' : '') + '</div></div>'; }).join('') + '</div>'; } }
  };
})();
