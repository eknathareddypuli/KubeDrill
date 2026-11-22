/* Readiness RANGE (never a single number, never a pass prediction). Inputs: your recent timed-exam scores for the track, how many skills
   you have practised, and how many labs needed the full answer. Everything is computed from local progress. */
(function () {
  'use strict';
  var KL = window.KL, store = KL.store;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var PASS = { CKA: 66, CKAD: 66, CKS: 67 };   // published pass marks
  function exams(track) { return store.data().exams.filter(function (e) { return String(e.track || '').split(' ')[0] === track; }); }
  function covOf(track) { var C = KL.COMP; if (!C) return null; var tot = 0, done = 0; C.ids(track).forEach(function (id) { var labs = C.labsFor(id).filter(function (l) { return KL.Labs.byId[l]; }); if (C.nosim[id] && !labs.length) return; tot++; if (labs.some(function (l) { return store.labDone(l); })) done++; }); return tot ? done / tot : 0; }
  KL.readiness = function (track) {
    var ex = exams(track), last = ex.slice(-3).map(function (e) { return e.pct; }), pass = PASS[track] || 66, cov = covOf(track), n = ex.length;
    var r = { track: track, n: n, pass: pass, cov: cov, lo: last.length ? Math.min.apply(null, last) : null, hi: last.length ? Math.max.apply(null, last) : null, level: 'unknown', notes: [] };
    if (n < 2) r.level = 'unknown';
    else if (r.lo >= pass + 9 && cov >= 0.8 && n >= 3) r.level = 'strong';
    else if (r.lo >= pass) r.level = 'borderline';
    else r.level = 'notyet';
    if (cov !== null && cov < 0.7) r.notes.push('You have practised ' + Math.round(cov * 100) + '% of the ' + track + ' skills. Open the coverage list and fill the gaps; an exam samples across the whole curriculum.');
    var rev = KL.fade ? KL.fade.list().filter(function (l) { return (l.track || []).indexOf(track) >= 0; }).length : 0;
    if (rev) r.notes.push(rev + ' lab' + (rev > 1 ? 's' : '') + ' needed the full answer. Redo ' + (rev > 1 ? 'them' : 'it') + ' without hints (see Revisit on the Labs page).');
    return r;
  };
  var HEAD = { unknown: 'Not enough timed attempts yet', notyet: 'Not ready yet: keep practising', borderline: 'Borderline: practise more', strong: 'Looking good in the simulator: keep practising' };
  KL.readinessHtml = function (track) {
    var r = KL.readiness(track), h = '<section class="rd rd-' + r.level + '" aria-label="Readiness range for ' + esc(track) + '"><h3>🎯 Readiness range · ' + esc(track) + '</h3>';
    if (r.lo === null) h += '<p class="rd-line"><b>' + HEAD.unknown + '.</b> Take 2 or more timed exams for ' + esc(track) + ' (Exam page). A range needs at least two scores; one score is luck.</p>';
    else {
      var lo = Math.max(0, Math.min(100, r.lo)), hi = Math.max(lo, Math.min(100, r.hi));
      h += '<p class="rd-line"><b>' + HEAD[r.level] + '.</b> Your last ' + Math.min(3, r.n) + ' timed exam' + (r.n > 1 ? 's' : '') + ' scored <b>' + r.lo + '% to ' + r.hi + '%</b> (pass mark ' + r.pass + '%). ' + (r.n < 2 ? 'Take at least one more for a range.' : '') + '</p>' +
        '<div class="rd-bar" role="img" aria-label="Score range ' + r.lo + ' to ' + r.hi + ' percent, pass mark ' + r.pass + '"><i class="rd-band" style="left:' + lo + '%;width:' + Math.max(2, hi - lo) + '%"></i><i class="rd-pass" style="left:' + r.pass + '%"></i><span class="rd-pl" style="left:' + r.pass + '%">pass ' + r.pass + '</span></div>';
    }
    h += r.notes.map(function (x) { return '<p class="rd-note">• ' + esc(x) + '</p>'; }).join('');
    h += '<p class="rd-foot"><b>Practise more before you sit the real exam.</b> This range comes from simulator labs: it cannot predict a real result. The real exam is proctored and timed on live clusters, with unfamiliar wording and less hand-holding, and simulator scores usually run higher than real ones. Repeat the labs without hints, practise on a real cluster (kind or minikube), and use the practice environment that comes with your exam registration.</p></section>';
    return h;
  };
  window.addEventListener('kl:store', function () { /* coverage page re-renders itself on kl:store */ });
})();
