/* Worked-example fading for every lab, built from the lab's own reference solution (no per-lab authoring).
   Level 1 Watch: the reference commands run one at a time, with the reason shown.  Level 2 Complete: the commands are shown with the key part blanked; you type them.
   Level 3 Solo: nothing shown. Passing at 2 or 3 without hints moves you up; a watched pass moves you to 2 but is never counted as a clean pass.
   Learn mode only. Exam and Real modes show nothing. State stays on this device. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, KEY = 'kubedrill:fadelvl', NAMES = ['', 'Watch', 'Complete', 'Solo'];
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rd() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function wr(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }
  function base(l) { return l.variantOf || l.id; }
  function level(l) { var v = rd()[base(l)]; return v >= 1 && v <= 3 ? v : 1; }
  function setLevel(l, v) { var o = rd(); o[base(l)] = Math.max(1, Math.min(3, v)); wr(o); }
  var VERB = { get: 'look at the current state', describe: 'read the events and conditions', logs: 'read what the container said', apply: 'apply the manifest', create: 'create the object', delete: 'remove the object', patch: 'change one field in place', set: 'change the object with a helper', edit: 'edit the live object', scale: 'change the replica count', rollout: 'drive or inspect a rollout', label: 'change labels', annotate: 'change annotations', expose: 'create a Service for it', run: 'start a pod', cordon: 'stop new pods landing on the node', uncordon: 'allow scheduling again', drain: 'evict pods from the node', taint: 'repel pods from the node', exec: 'run a command inside the pod', auth: 'check what an identity may do', config: 'work with kubeconfig contexts', top: 'look at resource use', explain: 'read the API schema' };
  function why(cmd) {
    var first = cmd.split('\n')[0].trim(), w = first.split(/\s+/);
    if (w[0] === 'ssh') return 'move onto the node to work there';
    if (/^(sudo|systemctl|journalctl|crictl|etcdctl|kubeadm|openssl|cat|ls)\b/.test(first)) return 'node-level step: ' + w[0];
    var v = w[1] === 'get' ? 'get' : (w[1] || ''), t = VERB[v];
    return t ? 'kubectl ' + v + ': ' + t : 'run it and read the output';
  }
  function mask(cmd) {
    if (/\n/.test(cmd)) return cmd.split('\n')[0] + '\n▢▢▢  (' + (cmd.split('\n').length - 1) + ' more lines: the manifest)';
    var m = cmd.match(/^(.*\s-p\s)(['"].*['"])$/); if (m) return m[1] + '▢▢▢';
    var t = cmd.split(/\s+/); if (t.length <= 2) return t[0] + ' ▢▢▢';
    for (var j = t.length - 1; j > 1; j--) { if (/^--?[\w-]+=.+/.test(t[j])) { t[j] = t[j].replace(/=.*/, '=▢▢▢'); return t.join(' '); } if (!/^-/.test(t[j])) break; }
    var i = t.length - 1; while (i > 1 && /^-/.test(t[i])) i--;
    t[i] = '▢▢▢'; return t.join(' ');
  }
  function steps(l) { return (l.solution || []).filter(function (c) { return typeof c === 'string' && c.trim(); }); }
  var pos = {};
  function panel(r) {
    var old = $('lfFade'); if (old) old.remove();
    if (!r || r.mode !== 'learn' || !$('lrTasks') || !steps(r.lab).length) return;
    var lab = r.lab, lv = level(lab), st = steps(lab), el = document.createElement('div'); el.id = 'lfFade'; el.className = 'lf-worked lf-fadep'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Worked example fading');
    function draw() {
      lv = level(lab); var n = pos[lab.id] || 0, h = '<h4>🪜 Practice level: <b>' + NAMES[lv] + '</b> <span class="fd-seg" role="group" aria-label="Practice level">' + [1, 2, 3].map(function (i) { return '<button class="fd-b' + (i === lv ? ' on' : '') + '" data-l="' + i + '" aria-pressed="' + (i === lv) + '">' + i + ' ' + NAMES[i] + '</button>'; }).join('') + '</span></h4>';
      if (lv === 1) {
        h += '<p class="fd-s">Watch the reference path run, one step at a time. A watched pass is not counted as a clean pass.</p>' + st.slice(0, n).map(function (c) { return '<div class="lf-step done">✓ ' + esc(why(c)) + '<br><code>$ ' + esc(c.split('\n')[0]) + (/\n/.test(c) ? ' …' : '') + '</code></div>'; }).join('');
        h += n < st.length ? '<div class="lf-step"><b>Next:</b> ' + esc(why(st[n])) + '</div><button class="btn-secondary" id="fdNext">▶ Run step ' + (n + 1) + ' of ' + st.length + '</button>' : '<div class="lf-step"><b>That is the whole path.</b> Press Check, then try level 2.</div>';
      } else if (lv === 2) {
        h += '<p class="fd-s">The command shapes are below with the key part blanked. Type them yourself; reveal one only if you are stuck (revealing counts as using the solution).</p><ol class="fd-l">' + st.map(function (c, i) { return '<li>' + esc(why(c)) + '<br><code id="fdC' + i + '">' + esc(mask(c)).replace(/\n/g, '<br>') + '</code> <button class="fd-r" data-i="' + i + '">reveal</button></li>'; }).join('') + '</ol>';
      } else h += '<p class="fd-s">Solo: no scaffolding. Hints are still there if you need them. A clean pass here is the goal.</p>';
      el.innerHTML = h;
      el.querySelectorAll('.fd-b').forEach(function (b) { b.onclick = function () { setLevel(lab, +b.dataset.l); draw(); }; });
      var nb = el.querySelector('#fdNext'); if (nb) nb.onclick = function () { var c = st[pos[lab.id] || 0]; pos[lab.id] = (pos[lab.id] || 0) + 1; r.solShown = true; r.fadeWatched = true; KL.runner.run(c); draw(); };
      el.querySelectorAll('.fd-r').forEach(function (b) { b.onclick = function () { var i = +b.dataset.i; r.solShown = true; var c = $('fdC' + i); if (c) c.innerHTML = esc(st[i]).replace(/\n/g, '<br>'); b.remove(); }; });
    }
    draw(); $('lrTasks').parentNode.insertBefore(el, $('lrTasks'));
  }
  window.addEventListener('kl:runner', function () { setTimeout(function () { var r = KL.runner && KL.runner.cur(); panel(r); }, 60); });
  window.addEventListener('kl:labdone', function (e) {
    var d = e.detail || {}; if (!d.lab || d.mode !== 'learn') return; var r = KL.runner.cur(); if (!r) return;
    var hints = Object.keys(r.hintIdx || {}).reduce(function (a, k) { return a + (r.hintIdx[k] || 0); }, 0), lv = level(d.lab), msg;
    if (r.fadeWatched) { setLevel(d.lab, 2); msg = 'Watched pass. Next time: level 2, Complete. Not counted as a clean pass.'; }
    else if (!r.solShown && !hints) { if (lv < 3) { setLevel(d.lab, lv + 1); msg = 'Clean pass at level ' + lv + ' (' + NAMES[lv] + '). Next time: level ' + (lv + 1) + ', ' + NAMES[lv + 1] + '.'; } else msg = 'Clean pass at level 3, Solo.'; }
    else msg = 'Passed with help, so the level stays at ' + lv + ' (' + NAMES[lv] + ').';
    setTimeout(function () { var fb = $('lrFeedback'); if (!fb) return; var o = $('lfFadeNote'); if (o) o.remove(); var n = document.createElement('div'); n.id = 'lfFadeNote'; n.className = 'lf-cmp'; n.textContent = '🪜 ' + msg; fb.parentNode.insertBefore(n, fb.nextSibling); }, 200);
  });
  KL.fadeLevel = { level: level, set: setLevel, mask: mask, why: why, steps: steps };
})();
