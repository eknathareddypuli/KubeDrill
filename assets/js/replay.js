/* Mistake replay: after a lab is solved, show the learner's own command trail next to the reference path, with each step marked
   (looked, changed, failed, repeated) and a short note on how the attempt went. Everything is computed locally from the commands
   the runner already sees. analyse() is pure so it can be tested without a browser. */
(function (root) {
  var KL = root.KL = root.KL || {};
  var READ = /^(get|describe|logs|explain|api-resources|api-versions|top|events|version|cluster-info|diff|wait)$/;
  function words(line) { return String(line || '').trim().replace(/^(sudo\s+)/, '').split(/\s+/); }
  function norm(line) { return String(line || '').replace(/\s+/g, ' ').trim(); }
  /** 'look' for a read-only command, 'change' for anything that can alter state. A line with several commands is a change if any part is. */
  function kind(line) {
    var parts = String(line || '').split(/\s*(?:&&|\|\||;|\n)\s*/).filter(function (p) { return p.trim(); }), anyChange = false;
    if (!parts.length) return 'look';
    parts.forEach(function (p) {
      var w = words(p), c = w[0], rest = w.slice(1);
      if (/>{1,2}\s*[^&\s]/.test(p.replace(/\d?>\s*\/dev\/null/g, '').replace(/\d?>&\d/g, ''))) { anyChange = true; return; } /* a redirect writes a file */
      if (c === 'ssh') { var inner = norm(p).replace(/^ssh\s+\S+\s+/, '').replace(/^['"]|['"]$/g, ''); if (kind(inner) === 'change') anyChange = true; return; }
      if (c === 'k' || c === 'kubectl') {
        var v = norm(p).replace(/^(k|kubectl)\s+/, '').replace(/(^|\s)(-n|--namespace|--context|--kubeconfig)(=\S+|\s+\S+)/g, ' ').split(/\s+/).filter(function (x) { return x && x.charAt(0) !== '-'; })[0] || '';
        if (READ.test(v)) return;
        if (v === 'auth' && /can-i|whoami/.test(p)) return;
        if (v === 'config' && /view|get-contexts|current-context|get-/.test(p)) return;
        if (v === 'rollout' && /\s(status|history)\b/.test(p)) return;
        if (/--dry-run(=client|=server)?\b/.test(p) && !/\|\s*kubectl\s+(apply|create)/.test(p) && !/>\s*\S+/.test(p)) return;
        anyChange = true; return;
      }
      if (/^(ls|cat|grep|head|tail|awk|sed|sort|wc|df|du|echo|printf|pwd|which|find|journalctl|crictl|trivy|ps|free|uname|id|whoami|openssl|ss|ip)$/.test(c)) {
        if (/^(sed)$/.test(c) && /\s-i\b/.test(p)) anyChange = true;
        if (/(^|\s)>{1,2}\s*\S+/.test(p) && !/>\s*\/dev\/null/.test(p)) anyChange = true; /* redirects write files */
        if (c === 'crictl' && /\s(rm|rmi|stop|prune)\b/.test(p)) anyChange = true;
        if (c === 'journalctl' && /--vacuum/.test(p)) anyChange = true;
        return;
      }
      if (c === 'helm' && /^(history|list|status|get|show|search|template|lint|repo)$/.test(rest[0] || '')) return;
      if (c === 'systemctl' && /^(status|is-active|is-enabled|list-units|cat)$/.test(rest[0] || '')) return;
      if (c === 'etcdctl' && /snapshot\s+status/.test(p)) return;
      if (c === 'kubeadm' && /check-expiration|upgrade\s+plan/.test(p)) return;
      anyChange = true;
    });
    return anyChange ? 'change' : 'look';
  }
  /** trail: [{line, code, t}], solution: [string]. Returns the marked steps and the summary numbers. */
  function analyse(trail, solution, startAt) {
    var seen = {}, steps = [], looked = 0, changed = 0, failed = 0, repeated = 0, firstChange = -1, firstLook = -1, gapMax = 0, gapAt = -1, prev = startAt || (trail[0] && trail[0].t) || 0;
    (trail || []).forEach(function (s, i) {
      var k = kind(s.line), key = norm(s.line), tag = k === 'look' ? 'look' : 'change';
      if (s.code && s.code !== 0) { tag = 'fail'; failed++; }
      else if (seen[key]) { tag = 'repeat'; repeated++; }
      else if (k === 'look') looked++; else changed++;
      if (k === 'look' && firstLook < 0) firstLook = i; if (k === 'change' && firstChange < 0) firstChange = i;
      seen[key] = 1; var gap = s.t && prev ? s.t - prev : 0; if (gap > gapMax) { gapMax = gap; gapAt = i; } if (s.t) prev = s.t;
      steps.push({ line: s.line, tag: tag, kind: k });
    });
    var ref = (solution || []).map(function (c) { return String(c).split('\n')[0]; });
    return { steps: steps, looked: looked, changed: changed, failed: failed, repeated: repeated, total: steps.length, refCount: ref.length, ref: ref,
      actedFirst: firstChange >= 0 && (firstLook < 0 || firstChange < firstLook), gapMax: gapMax, gapAt: gapAt };
  }
  function notes(a) {
    var n = [];
    if (a.actedFirst) n.push('Your first command changed something before you had looked at the cluster. A <code>get</code> or <code>describe</code> first would have told you what to change.');
    if (a.failed) n.push(a.failed + ' command' + (a.failed === 1 ? '' : 's') + ' failed. Read the error text: it usually names the exact object or field that is wrong.');
    if (a.repeated) n.push('You repeated ' + a.repeated + ' command' + (a.repeated === 1 ? '' : 's') + ' unchanged. If the output did not change your mind, the next move is a different command, not the same one again.');
    if (a.total > a.refCount * 3 && a.total > 8) n.push('The reference path is ' + a.refCount + ' commands and yours was ' + a.total + '. Most of the extra were ' + (a.looked > a.changed ? 'looks, which is fine while learning but costs time in an exam' : 'changes, so try to find the cause before changing anything') + '.');
    if (!n.length) n.push('A tidy attempt: you looked, you changed what mattered, and you did not repeat yourself.');
    return n;
  }
  KL.replay = { kind: kind, analyse: analyse, notes: notes };

  if (typeof window === 'undefined') return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  window.addEventListener('kl:cmd', function (e) {
    var d = e.detail || {}, r = d.run, res = d.res; if (!r || !res) return; var line = String(d.line || '').trim(); if (!line || line === 'clear') return;
    (r.trail = r.trail || []).push({ line: line.slice(0, 200), code: res.code || 0, t: Date.now() }); if (r.trail.length > 300) r.trail.shift();
  });
  var MARK = { look: ['👁', 'looked'], change: ['✎', 'changed'], fail: ['✗', 'failed'], repeat: ['↻', 'repeated'] };
  function html(r) {
    var a = KL.replay.analyse(r.trail || [], (r.lab && r.lab.solution) || [], r.start); if (!a.total) return '';
    var shown = a.steps.slice(0, 40);
    var you = shown.map(function (s) { return '<li class="rp-' + s.tag + '"><span class="rp-m" title="' + MARK[s.tag][1] + '">' + MARK[s.tag][0] + '</span> <code>' + esc(s.line.length > 110 ? s.line.slice(0, 107) + '...' : s.line) + '</code></li>'; }).join('') + (a.steps.length > 40 ? '<li class="rp-more">... and ' + (a.steps.length - 40) + ' more</li>' : '');
    var ref = a.ref.slice(0, 20).map(function (c) { return '<li><code>' + esc(c.length > 110 ? c.slice(0, 107) + '...' : c) + '</code></li>'; }).join('');
    var sum = a.total + ' command' + (a.total === 1 ? '' : 's') + ': ' + a.looked + ' looked, ' + a.changed + ' changed, ' + a.failed + ' failed, ' + a.repeated + ' repeated. Reference path: ' + a.refCount + '.';
    var gap = a.gapMax > 45000 && a.gapAt >= 0 ? '<p class="pro-note">Longest pause: ' + Math.round(a.gapMax / 1000) + ' s before <code>' + esc(a.steps[a.gapAt].line.slice(0, 60)) + '</code>.</p>' : '';
    return '<details class="lr-debrief rp-box" open><summary><b>🔁 Replay: your path and the reference path</b></summary><p class="rp-sum">' + esc(sum) + '</p>' +
      '<div class="rp-cols"><div><h5>Your commands</h5><ol class="rp-you">' + you + '</ol></div><div><h5>Reference path</h5><ol class="rp-ref">' + ref + '</ol></div></div>' +
      '<ul class="rp-notes">' + KL.replay.notes(a).map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>' + gap +
      '<p class="pro-note">The reference path is one valid way. Any fix that passes the checks counts, and yours may be better.</p></details>';
  }
  KL.replay.html = html;
  window.addEventListener('kl:result', function (e) {
    var d = e.detail || {}, r = d.run, res = d.res, fb = $('lrFeedback'); if (!r || !res || !res.ok || !fb || fb.querySelector('.rp-box')) return;
    var h = html(r); if (h) fb.insertAdjacentHTML('beforeend', h);
  });
})(typeof window !== 'undefined' ? window : globalThis);
