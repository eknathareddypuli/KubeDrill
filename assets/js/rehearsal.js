/* Exam rehearsal: a two-hour dry run built on the existing full mocks (16 tasks, weighted by the public curriculum domains, real-exam environment with
   no checker or hints), plus a notes pane like the scratch area a candidate would keep. The label is deliberate: it is practice, not the exam. */
(function () {
  'use strict';
  var KL = window.KL, S = KL.exam, NK = 'kubedrill:rehearse-notes';
  function $(i) { return document.getElementById(i); }
  function load() { try { return JSON.parse(localStorage.getItem(NK)) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(NK, JSON.stringify(o)); } catch (e) { /* ignore */ } }
  function card() {
    return '<div class="rh-card" id="rhCard"><div class="rh-tag">Rehearsal</div><h3>A two-hour dry run</h3>' +
      '<p><b>This is practice, not the real exam, and not equivalent to it.</b> It uses our own tasks on our simulator, 16 tasks in 120 minutes, picked by the public curriculum weights, in the real-exam style: no checker, no hints, docs only, and a notes pane.</p>' +
      '<div class="rh-row"><label>Track <select id="rhTrack"><option>CKA</option><option>CKAD</option><option>CKS</option></select></label><label>Tasks <select id="rhSet"><option value="full">Fresh set every time</option><option value="full-1">Fixed set 1 (repeatable)</option><option value="full-2">Fixed set 2</option><option value="full-3">Fixed set 3</option></select></label>' +
      '<button class="btn-primary" id="rhGo">Start rehearsal</button></div>' +
      '<p class="rh-small">You get a domain report at the end. Your notes stay on this device. You can leave and come back: the clock keeps running, like the real thing.</p></div>';
  }
  function mount() {
    var root = $('examRoot'); if (!root || S.active || $('rhCard')) return;
    var host = root.querySelector('.section-header') || root.firstChild; var d = document.createElement('div'); d.innerHTML = card();
    if (host && host.nextSibling) root.insertBefore(d.firstChild, host.nextSibling); else root.insertBefore(d.firstChild, root.firstChild);
    $('rhGo').onclick = function () { var id = $('rhTrack').value.toLowerCase() + '-' + $('rhSet').value; S.startBundle(id, true, { rehearsal: true }); };
  }
  var root0 = document.getElementById('examRoot');
  if (root0) new MutationObserver(function () { mount(); }).observe(root0, { childList: true });
  window.addEventListener('hashchange', function () { if (location.hash === '#exam') setTimeout(mount, 0); });
  // notes pane while a rehearsal runs
  window.addEventListener('kl:runner', function () {
    var a = S.active; if (!a || !a.rehearsal) return; var bar = document.querySelector('.lr-bar'); if (!bar || $('rhNotesBtn')) return;
    var b = document.createElement('button'); b.className = 'btn-secondary rh-nbtn'; b.id = 'rhNotesBtn'; b.textContent = '📝 Notes'; b.setAttribute('aria-expanded', 'false'); bar.appendChild(b);
    function open() {
      var d = $('rhNotes'); if (d) { d.remove(); b.setAttribute('aria-expanded', 'false'); return; }
      var n = load(); if (n.start !== a.start) n = { start: a.start, text: '' };
      d = document.createElement('div'); d.id = 'rhNotes'; d.className = 'rh-notes'; d.innerHTML = '<div class="rh-nh"><b>Notes</b><button id="rhNx" aria-label="Close notes">✕</button></div><textarea id="rhNt" spellcheck="false" aria-label="Rehearsal notes" placeholder="Scratch area: task numbers to revisit, commands to remember. Saved on this device."></textarea>';
      document.body.appendChild(d); var t = $('rhNt'); t.value = n.text; t.focus(); b.setAttribute('aria-expanded', 'true');
      t.oninput = function () { save({ start: a.start, text: t.value }); }; $('rhNx').onclick = open;
    }
    b.onclick = open;
  });
  KL.rehearsal = { notes: load };
})();
