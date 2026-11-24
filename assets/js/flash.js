/* Flashcards: the quiz bank as flip cards (question front, answer and explanation back). Grades feed the same spaced-repetition store as the quiz.
   The flip is a CSS rotateY; with reduced motion or the Motion toggle off the card swaps faces instantly. Keys: Space flips, 1 = missed it, 2 = knew it. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {};
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  var S = { deck: [], i: 0, ok: 0, flipped: false };
  function pick() {
    var tr = ($('quizTrackFilter') || {}).value || 'all', cat = ($('quizCatFilter') || {}).value || 'all', df = ($('quizDiffFilter') || {}).value || 'all';
    var d = (KL.quizAll || []).filter(function (q) { return (tr === 'all' || (q.tr || []).indexOf(tr) >= 0) && (cat === 'all' || q.cat === cat) && (df === 'all' || q.diff === df); });
    for (var i = d.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t; }
    return d.slice(0, 15);
  }
  function answer(q) { return q.type === 'mcq' ? q.opts[q.ans] : q.type === 'cmd' ? q.show : (q.show || (q.opts && q.opts[q.ans]) || ''); }
  function draw() {
    var host = $('flashRoot'); if (!host) return;
    if (S.i >= S.deck.length) { host.innerHTML = '<div class="fc-done"><h3>Deck finished</h3><p>' + S.ok + ' of ' + S.deck.length + ' marked as known. Missed cards come back through spaced repetition in the quiz.</p><button class="btn-primary" id="fcAgain" type="button">New deck</button> <button class="btn-secondary" id="fcExit" type="button">Back to quiz</button></div>'; $('fcAgain').onclick = start; $('fcExit').onclick = exit; return; }
    var q = S.deck[S.i]; S.flipped = false;
    host.innerHTML = '<div class="fc-meta"><span>Card ' + (S.i + 1) + ' of ' + S.deck.length + ' · ' + esc(q.cat || '') + ' · ' + esc(q.diff || '') + '</span><button class="lr-linkbtn" id="fcExit" type="button">Back to quiz</button></div>' +
      '<div class="fc-card" id="fcCard" role="button" tabindex="0" aria-pressed="false" aria-label="Flashcard. Press Space to flip."><div class="fc-in">' +
      '<div class="fc-face fc-front"><p class="fc-q">' + fmt(q.q) + '</p><span class="fc-hint">Space or click to flip</span></div>' +
      '<div class="fc-face fc-back" aria-hidden="true"><p class="fc-a">' + fmt(answer(q)) + '</p><p class="fc-e">' + fmt(q.exp || '') + '</p></div></div></div>' +
      '<div class="fc-grade" id="fcGrade" hidden><button class="btn-secondary" id="fcNo" type="button">1 · Missed it</button> <button class="btn-primary" id="fcYes" type="button">2 · Knew it</button></div>';
    $('fcExit').onclick = exit; $('fcCard').onclick = flip;
    $('fcNo').onclick = function () { grade(false); }; $('fcYes').onclick = function () { grade(true); };
    $('fcCard').focus();
  }
  function flip() { var c = $('fcCard'); if (!c) return; S.flipped = !S.flipped; c.classList.toggle('flipped', S.flipped); c.setAttribute('aria-pressed', S.flipped); c.querySelector('.fc-back').setAttribute('aria-hidden', !S.flipped); c.querySelector('.fc-front').setAttribute('aria-hidden', S.flipped); $('fcGrade').hidden = !S.flipped; }
  function grade(ok) { var q = S.deck[S.i]; try { KL.store.qRecord(q.id, ok); } catch (e) { /* ignore */ } if (ok) S.ok++; S.i++; draw(); }
  function start() { S = { deck: pick(), i: 0, ok: 0, flipped: false }; var q = $('quizCard'); if (q) { /* quiz cards stay in the page; flashcards replace the view */ } var pg = $('page-quiz'); pg.classList.add('fc-on'); var h = $('flashRoot'); if (!h) { h = document.createElement('div'); h.id = 'flashRoot'; h.className = 'fc-root'; var qc = $('quizCard'); qc.parentNode.insertBefore(h, qc); } if (!S.deck.length) { h.innerHTML = '<p>No questions match these filters.</p><button class="btn-secondary" id="fcExit" type="button">Back to quiz</button>'; $('fcExit').onclick = exit; return; } draw(); }
  function exit() { var pg = $('page-quiz'); pg.classList.remove('fc-on'); var h = $('flashRoot'); if (h) h.remove(); }
  document.addEventListener('keydown', function (e) {
    if (!document.body.contains($('fcCard')) || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName)) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } else if (S.flipped && e.key === '1') grade(false); else if (S.flipped && e.key === '2') grade(true);
  });
  function inject() {
    var f = $('quizModeFilter'); if (!f || $('fcStart')) return;
    var b = document.createElement('button'); b.id = 'fcStart'; b.type = 'button'; b.className = 'btn-secondary fc-start'; b.textContent = '🃏 Flashcards'; b.onclick = start; f.parentNode.appendChild(b);
  }
  new MutationObserver(inject).observe(document.body, { childList: true, subtree: true }); inject();
  KL.flash = { start: start };
})();
