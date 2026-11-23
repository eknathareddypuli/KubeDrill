/* Version-aware labs: a "my cluster / exam version" selector (stored on this device only), version chips in the lab header,
   and a warning when a lab leans on a feature newer than the version you set. The exam version is never assumed: the Linux
   Foundation moves it, so check the official exam page and set it here. */
(function () {
  'use strict';
  var KL = window.KL, V = KL.versions, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sel() { return '<label>Kubernetes version I am practising for <select id="verSel" aria-label="Target Kubernetes version"><option value="">not set</option>' + V.VERSIONS.map(function (v) { return '<option value="' + v + '"' + (V.getTarget() === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></label>'; }
  function barText() {
    var t = V.getTarget(); if (!t) return 'Set the version of your cluster or exam to see which labs need newer features. Check the official exam page for the current version: it changes.';
    var n = KL.Labs.list.filter(function (l) { return !V.status(l, t).ok; }).length;
    return n ? '<b>' + n + '</b> lab' + (n > 1 ? 's use' : ' uses') + ' features newer than ' + t + ' and are marked “newer than ' + t + '”.' : 'Every lab works on ' + t + '.';
  }
  function mark() {
    var t = V.getTarget();
    document.querySelectorAll('#ilabsList .ilab-card').forEach(function (c) {
      var old = c.querySelector('.vc'); if (old) old.remove(); var lab = KL.Labs.byId[c.dataset.id]; if (!lab || !t) return;
      var st = V.status(lab, t); if (st.ok) return;
      var top = c.querySelector('.ilab-top'); if (top) top.insertAdjacentHTML('beforeend', '<span class="vc warn" title="' + esc(st.blockers.map(function (f) { return f.name + ': on by default from ' + f.on; }).join('; ')) + '">newer than ' + t + '</span>');
    });
  }
  function labsBar() {
    var host = $('dailyCard'); if (!host) return; var bar = $('verBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'verBar'; bar.className = 'ver-bar'; host.parentNode.insertBefore(bar, host); }
    bar.innerHTML = sel() + '<span id="verTxt">' + barText() + '</span>';
    $('verSel').onchange = function () { V.setTarget(this.value); $('verTxt').innerHTML = barText(); mark(); window.dispatchEvent(new CustomEvent('kl:version')); };
    setTimeout(mark, 60);
  }
  KL.route('labs', function () { labsBar(); setTimeout(mark, 200); });
  window.addEventListener('kl:filter', mark);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.filter-btn')) setTimeout(mark, 80); });
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'labSearch') setTimeout(mark, 80); });
  // lab header: feature chips and the "newer than your version" note
  window.addEventListener('kl:runner', function (e) {
    setTimeout(function () {
      var lab = e.detail && e.detail.lab, chips = document.querySelector('.lr-chips'); if (!lab || !chips || chips.querySelector('.vc')) return;
      var rec = V.recentOf(lab); rec.forEach(function (f) { var s = document.createElement('span'); s.className = 'vc'; s.title = f.note; s.textContent = '⏱ ' + f.name.split(' (')[0] + (f.ga ? ' · GA ' + f.ga : ' · on from ' + f.on); chips.appendChild(s); });
      var t = V.getTarget(), st = V.status(lab, t); if (!t || st.ok || document.querySelector('.ver-note')) return;
      var d = document.createElement('div'); d.className = 'ver-note';
      d.innerHTML = '<b>Newer than your target (' + esc(t) + ').</b> ' + st.blockers.map(function (f) { return esc(f.name) + ' is on by default from ' + f.on + '. ' + esc(f.note); }).join(' ') + ' Treat this lab as optional for a ' + esc(t) + ' cluster or exam, or practise it to learn what is coming.';
      chips.parentNode.insertBefore(d, chips.nextSibling);
    }, 120);
  });
})();
