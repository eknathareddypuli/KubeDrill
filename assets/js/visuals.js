/* Cluster visuals and small motion cues. CSS-only animation, offline. Honours prefers-reduced-motion and the Motion toggle (html[data-motion=off]).
   Never hides or softens a result: every cue is added after the real output is on screen, and the same facts are always shown as text. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {};
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function off() { return document.documentElement.getAttribute('data-motion') === 'off'; }
  var main = $('main');
  if (!main || !window.MutationObserver) return;
  function tag(el, cls, ms) { if (off() || !el) return; el.classList.add(cls); setTimeout(function () { el.classList.remove(cls); }, ms); }

  // ── small cues: terminal result flash, reading clue pulse, page fade ──
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.classList && n.classList.contains('lr-o') && n.parentNode && n.parentNode.id === 'lrOut') tag($('lrPrompt'), n.classList.contains('err') ? 'vz-bad' : 'vz-ok', 300);
        if (n.querySelector) n.querySelectorAll('.rd-l.hit').forEach(function (l) { tag(l, 'vz-pop', 400); });
        if (n.querySelector && (n.id === 'lrDia' || n.querySelector('#lrDia'))) retry(0);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', function () { setTimeout(function () { tag(document.querySelector('.page.active'), 'vz-fade', 150); }, 0); });

  function retry(n) { render(); if (!$('lrVz') && n < 20) setTimeout(function () { retry(n + 1); }, 150); }
  // ── cluster panel: scheduler view (node capacity, taints), control plane, volumes, quotas, probes ──
  var snap = null;
  function run() { return KL.runner && KL.runner.cur && KL.runner.cur(); }
  function bar(label, used, total, fmt) {
    var pct = total > 0 ? Math.min(1, used / total) : 0, cls = pct > 0.9 ? ' hot' : pct > 0.7 ? ' warm' : '';
    return '<div class="vz-row"><span class="vz-l">' + esc(label) + '</span><span class="vz-bar' + cls + '" role="img" aria-label="' + esc(label + ' ' + fmt(used) + ' of ' + fmt(total)) + '"><i style="transform:scaleX(' + pct.toFixed(3) + ')"></i></span><span class="vz-t">' + esc(fmt(used) + ' / ' + fmt(total)) + '</span></div>';
  }
  function tolerates(p, t) { return (p.spec.tolerations || []).some(function (x) { return x.operator === 'Exists' ? (!x.key || x.key === t.key) : (x.key === t.key && (x.value || '') === (t.value || '')); }); }
  function panelHtml(s) {
    var U = KL.Sim.util, h = '', nodes = s.list('Node', ''), pods = s.list('Pod').filter(function (p) { return !/^kube-/.test(p.metadata.namespace); });
    var pend = pods.filter(function (p) { return p.status.phase === 'Pending' && !p.spec.nodeName; });
    h += '<div class="vz-sec"><h6>Scheduler view</h6>';
    nodes.forEach(function (n) {
      var nm = n.metadata.name, al = (n.status && n.status.allocatable) || {}, u = s.nodeUsed(nm), cpuT = U.parseCpu(al.cpu || '0'), memT = U.parseMem(al.memory || '0');
      var tn = (n.spec.taints || []).map(function (t) { var m = pend.some(function (p) { return tolerates(p, t); }); return '<span class="vz-chip' + (m ? ' match' : '') + '" title="' + (m ? 'a pending pod tolerates this taint' : 'taint') + '">⚑ ' + esc(t.key + (t.value ? '=' + t.value : '') + ':' + t.effect) + '</span>'; }).join('');
      h += '<div class="vz-node"><b>' + esc(nm) + '</b>' + (n.spec.unschedulable ? '<span class="vz-chip">cordoned</span>' : '') + tn +
        bar('cpu requests', u.cpu, cpuT, function (v) { return U.fmtCpu(v); }) + bar('memory requests', u.mem, memT, function (v) { return Math.round(v) + 'Mi'; }) + '</div>';
    });
    if (pend.length) h += '<p class="vz-note">' + pend.length + ' pod' + (pend.length > 1 ? 's' : '') + ' waiting for a node: ' + esc(pend.slice(0, 3).map(function (p) { return p.metadata.name; }).join(', ')) + '</p>';
    h += '</div>';
    var f = s.flags || {};
    if (f.cp) {
      var comps = [['kube-apiserver', 'API server'], ['kube-scheduler', 'scheduler'], ['kube-controller-manager', 'controllers'], ['etcd', 'etcd']];
      h += '<div class="vz-sec"><h6>Control plane</h6><div class="vz-cp">' + comps.map(function (c) { var down = false; try { down = s.cpDown(c[0]); } catch (e) { /* ignore */ } return '<span class="vz-hb ' + (down ? 'down' : 'up') + '"><i></i>' + c[1] + (down ? ' (down)' : '') + '</span>'; }).join('') + '</div>';
      if (f.etcdDb && f.etcdDb.size) { var q = 2147483648, pct = Math.min(1, f.etcdDb.size / q); h += bar('etcd database', f.etcdDb.size / 1048576, q / 1048576, function (v) { return Math.round(v) + 'MiB'; }); }
      h += '</div>';
    }
    var pvcs = s.list('PersistentVolumeClaim');
    if (pvcs.length) h += '<div class="vz-sec"><h6>Volumes</h6>' + pvcs.slice(0, 6).map(function (c) { var bound = c.status && c.status.phase === 'Bound'; return '<div class="vz-vol ' + (bound ? 'bound' : 'wait') + '"><span>' + esc(c.metadata.name) + '</span><i></i><span>' + (bound ? esc(c.spec.volumeName || '') : esc((c.status && c.status.phase) || 'Pending')) + '</span></div>'; }).join('') + '</div>';
    var qs = s.list('ResourceQuota'), qh = '';
    qs.forEach(function (q) { var hard = (q.spec && q.spec.hard) || {}, used = s.quotaUsed(q.metadata.namespace); Object.keys(hard).slice(0, 4).forEach(function (k) {
      if (used[k] === undefined) return; var isCpu = /cpu/.test(k), isMem = /memory/.test(k), tot = isCpu ? U.parseCpu(hard[k]) : isMem ? U.parseMem(hard[k]) : parseFloat(hard[k]);
      qh += bar(q.metadata.name + ' ' + k, used[k], tot, function (v) { return isCpu ? U.fmtCpu(v) : isMem ? Math.round(v) + 'Mi' : String(Math.round(v)); }); }); });
    if (qh) h += '<div class="vz-sec"><h6>Quotas</h6>' + qh + '</div>';
    var pr = pods.filter(function (p) { return p.spec.containers.some(function (c) { return c.readinessProbe || c.livenessProbe; }); });
    if (pr.length) h += '<div class="vz-sec"><h6>Probes</h6><div class="vz-probes">' + pr.slice(0, 12).map(function (p) { var ok = s.podReady(p) && p.status.phase === 'Running'; return '<span class="vz-pr ' + (ok ? 'ok' : 'bad') + '" title="' + esc(p.metadata.name) + '"><i></i>' + esc(p.metadata.name.slice(-12)) + '</span>'; }).join('') + '</div></div>';
    return h;
  }
  function render() {
    var r = run(), host = $('lrDia'); if (!r || !host || r.mode !== 'learn') return;
    try { if (!snap || snap.id !== r.sim) snap = { id: r.sim, m: podMap(r.sim) }; } catch (e) { /* ignore */ }
    var p = $('lrVz'); if (!p) { p = document.createElement('details'); p.id = 'lrVz'; p.className = 'vz-panel'; p.open = true; host.parentNode.insertBefore(p, host.nextSibling); }
    try { p.innerHTML = '<summary>Scheduler and cluster view</summary><div class="vz-body">' + panelHtml(r.sim) + '</div>'; } catch (e) { p.innerHTML = '<summary>Scheduler and cluster view</summary><p class="vz-note">view unavailable: ' + esc(e.message) + '</p>'; }
  }

  // ── terminal: pod lifecycle pills (what changed with this command) and revision tint on the diagram ──
  function podMap(s) { var m = {}; s.list('Pod').filter(function (p) { return !/^kube-/.test(p.metadata.namespace); }).forEach(function (p) { m[p.metadata.namespace + '/' + p.metadata.name] = s.podStatus(p); }); return m; }
  function cls(st) { return /Running|Completed|Succeeded/.test(st) ? 'ok' : /Terminating/.test(st) ? 'term' : /Pending|ContainerCreating|Init|PodInitializing/.test(st) ? 'wait' : 'bad'; }
  window.addEventListener('kl:cmd', function (e) {
    var r = e.detail && e.detail.run; if (!r || !r.sim) return; var s = r.sim, now;
    try { now = podMap(s); } catch (x) { return; }
    var line = e.detail.line || '';
    if (snap && snap.id === r.sim && /^\s*(kubectl|k)\s+(apply|create|scale|delete|rollout|set|patch|run|replace|taint|cordon|uncordon|drain|edit|label|annotate)\b/.test(line)) {
      var ch = [], k; for (k in now) if (snap.m[k] !== now[k]) ch.push([k, snap.m[k] || 'new', now[k]]); for (k in snap.m) if (!(k in now)) ch.push([k, snap.m[k], 'gone']);
      var o = $('lrOut'); if (ch.length && o && r.mode === 'learn') {
        var d = document.createElement('div'); d.className = 'lr-o vz-life'; d.setAttribute('aria-label', 'Pod changes caused by this command');
        d.innerHTML = ch.slice(0, 8).map(function (c, i) { return '<span class="vz-pill ' + cls(c[2]) + '" style="animation-delay:' + (i * 60) + 'ms">' + esc(c[0].split('/')[1].slice(-18)) + ' <em>' + esc(c[1]) + ' ▸ ' + esc(c[2]) + '</em></span>'; }).join('') + (ch.length > 8 ? '<span class="vz-more">+' + (ch.length - 8) + ' more</span>' : '');
        o.appendChild(d); var t = $('lrTerm'); if (t) t.scrollTop = t.scrollHeight;
      }
    }
    snap = { id: r.sim, m: now };
    render();
    // rollout tint: pods of the same revision share a colour bar on the diagram
    document.querySelectorAll('#lrDia .dia-pod').forEach(function (el) { var kk = (el.dataset.k || '').split('/'), p = s.get('Pod', kk[0], kk[1]); if (!p) return; var rv = (p.metadata.labels || {})['controller-revision-hash'] || (p.metadata.labels || {})['pod-template-hash'] || ''; if (!rv) return; var hh = 0, i; for (i = 0; i < rv.length; i++) hh = (hh * 31 + rv.charCodeAt(i)) % 360; el.style.setProperty('--rev', 'hsl(' + hh + ',75%,62%)'); el.classList.add('has-rev'); el.title = el.title.replace(/ — revision .*$/, '') + ' — revision ' + rv; });
  });
  if ($('lrDia')) retry(0);
  KL.vz = { render: render };
})();
