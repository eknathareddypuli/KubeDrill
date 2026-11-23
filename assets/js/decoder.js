/* Error decoder page (#decode), the "errors you hit on the way" recap and the teach-back box on the lab result card.
   Everything runs locally; pasted text never leaves the page. Rules live in data/decoder-data.js. */
(function () {
  'use strict';
  var KL = window.KL, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hitHtml(h, compact) {
    return '<article class="dec-hit"><h4>' + esc(h.title) + '</h4>' + (h.match ? '<p class="dec-seen">matched: <code>' + esc(h.match) + '</code></p>' : '') +
      '<p>' + esc(h.plain) + '</p>' +
      (compact ? '' : '<div class="dec-cols"><div><b>Look at</b><ul>' + h.look.map(function (c) { return '<li><code>' + esc(c) + '</code></li>'; }).join('') + '</ul></div>' +
        '<div><b>Usual fix</b><p>' + esc(h.fix) + '</p><b>Tempting wrong move</b><p>' + esc(h.trap) + '</p></div></div>') +
      (h.lab && KL.Labs.byId[h.lab] ? '<p class="dec-lab">Practise this: <a href="#lab/' + h.lab + '">' + esc(KL.Labs.byId[h.lab].num + ' · ' + KL.Labs.byId[h.lab].title) + '</a></p>' : '') + '</article>';
  }
  var EXAMPLES = ['ex-img', 'ex-oom', 'ex-pend', 'ex-rbac', 'ex-ep', 'ex-yaml'].map(function () { return null; });
  function pickExamples() {
    var want = ['img-tag', 'oom', 'sched-taint', 'rbac', 'cfg-key', 'immutable', 'refused', 'probe'], out = [];
    KL.decoderRules.forEach(function (r) { if (want.indexOf(r.id) >= 0) out.push({ id: r.id, label: r.title.replace(/\{\d\}/g, '…'), ex: r.ex }); });
    return out;
  }
  function render() {
    var root = $('decodeRoot'); if (!root) return;
    root.innerHTML = '<div class="section-header"><div class="section-tag">Decoder</div><h2 class="section-title">Error message decoder</h2><p class="section-desc">Paste an error, an Events block or <code>kubectl describe</code> output. It names the likely cause in plain English, the next commands to run and the tempting wrong move. It never guesses beyond its ' + KL.decoderRules.length + ' rules, and it runs entirely in your browser.</p></div>' +
      '<div class="dec-box"><label for="decIn">Paste here</label><textarea id="decIn" rows="7" spellcheck="false" placeholder="e.g. Failed to pull image &quot;nginx:1.255&quot;: manifest unknown"></textarea>' +
      '<div class="dec-ex"><span>Try an example:</span>' + pickExamples().map(function (e) { return '<button type="button" class="lr-linkbtn" data-ex="' + e.id + '">' + esc(e.label) + '</button>'; }).join('') + '</div>' +
      '<p class="pro-note">Do not paste secrets or tokens from a real cluster, even though nothing is sent anywhere. The decoder suggests where to look: it cannot see your cluster, so confirm with the commands it lists.</p></div><div id="decOut" aria-live="polite"></div>';
    var inp = $('decIn'), t;
    function run() { var v = inp.value.trim(), out = $('decOut'); if (!v) { out.innerHTML = ''; return; } var hits = KL.decode(v, 4); out.innerHTML = hits.length ? '<h3 class="dec-h">' + hits.length + ' likely cause' + (hits.length > 1 ? 's, most specific first' : '') + '</h3>' + hits.map(function (h) { return hitHtml(h); }).join('') : '<p class="dec-none">No rule matched. Look for the <b>Events</b> section (<code>kubectl describe</code>) and the first line that says Warning or Failed, and paste just that. If it is a real Kubernetes error this tool misses, <a href="https://github.com/eknatha/KubeLab/issues/new" target="_blank" rel="noopener">tell us</a>.</p>'; }
    inp.oninput = function () { clearTimeout(t); t = setTimeout(run, 150); };
    root.querySelectorAll('[data-ex]').forEach(function (b) { b.onclick = function () { var r = KL.decoderRules.filter(function (x) { return x.id === b.dataset.ex; })[0]; inp.value = r.ex; run(); }; });
  }
  KL.route('decode', render);

  // ── remember what went wrong while a lab is running ──
  window.addEventListener('kl:cmd', function (e) {
    var d = e.detail || {}, r = d.run, res = d.res; if (!r || !res) return;
    var txt = (res.stderr || '') + ''; if (!txt.trim() || res.code === 0) return;
    (r.errs = r.errs || []).push({ cmd: String(d.line || '').slice(0, 120), text: txt.slice(0, 800) }); if (r.errs.length > 30) r.errs.shift();
  });
  function recap(r) {
    var seen = {}, out = [];
    (r.errs || []).forEach(function (x) { KL.decode(x.text, 1).forEach(function (h) { if (!seen[h.id] && out.length < 3) { seen[h.id] = 1; out.push({ cmd: x.cmd, hit: h }); } }); });
    if (!out.length) return '';
    return '<div class="lr-debrief dec-recap"><h4>🔎 Errors you hit on the way</h4>' + out.map(function (o) { return '<p><code>' + esc(o.cmd) + '</code><br>' + '<b>' + esc(o.hit.title) + '</b>: ' + esc(o.hit.plain) + '</p>'; }).join('') + '<p class="dec-lab"><a href="#decode">Open the error decoder</a></p></div>';
  }
  KL.decoder = { recap: recap, hitHtml: hitHtml };

  // ── teach-back: write the root cause in your own words, then compare ──
  var TK = 'kubedrill:teach:';
  window.addEventListener('kl:result', function (e) {
    var d = e.detail || {}, r = d.run, res = d.res, fb = $('lrFeedback'); if (!r || !res || !res.ok || !fb) return;
    var rec = recap(r), deb = fb.querySelector('.lr-debrief'); if (rec) { var tmp = document.createElement('div'); tmp.innerHTML = rec; if (deb) deb.parentNode.insertBefore(tmp.firstChild, deb); else fb.appendChild(tmp.firstChild); }
    deb = fb.querySelector('.lr-debrief:not(.dec-recap)'); var dd = deb && deb.querySelector('dd'); if (!deb || !dd || fb.querySelector('.tb-box')) return;
    var id = r.lab.variantOf || r.lab.id, saved = ''; try { saved = localStorage.getItem(TK + id) || ''; } catch (x) { /* ignore */ }
    dd.style.display = 'none'; var dt = deb.querySelector('dt'); if (dt) dt.style.display = 'none';
    var box = document.createElement('div'); box.className = 'tb-box';
    box.innerHTML = '<h4>✍️ Explain it in your own words first</h4><p>One or two sentences: what was the root cause, and why did your fix work? Writing it down is what makes it stick.</p><textarea id="tbIn" rows="3" maxlength="500" aria-label="Root cause in your own words">' + esc(saved) + '</textarea><div class="tb-act"><button class="btn-primary" id="tbGo" type="button">Compare with the debrief</button> <button class="lr-linkbtn" id="tbSkip" type="button">Skip and show it</button></div>';
    deb.parentNode.insertBefore(box, deb);
    function reveal(mine) {
      dd.style.display = ''; if (dt) dt.style.display = '';
      if (mine) { try { localStorage.setItem(TK + id, mine); } catch (x) { /* ignore */ } box.innerHTML = '<h4>✍️ Your words vs the debrief</h4><p class="tb-mine">' + esc(mine) + '</p><p class="pro-note">Compare it with the <b>Root cause</b> below. Did you name the real cause, or only the symptom? Anything missing is what to remember next time.</p>'; }
      else box.remove();
    }
    $('tbGo').onclick = function () { var v = $('tbIn').value.trim(); reveal(v.length >= 8 ? v : ''); };
    $('tbSkip').onclick = function () { reveal(''); };
  });
})();
