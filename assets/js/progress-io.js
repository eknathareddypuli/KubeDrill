/* Full progress backup and restore. Earlier backups held only the main progress record (kubedrill:v1); this one also keeps lab review schedules,
   trainer state, weak spots, drills, reading marks and the worked-example level. Old backup files still import. Everything stays on this device. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {};
  var SKIP = /^(kubedrill:probe|kubedrill:exam-active|kubedrill:lastExport)$/;
  function keys() { var out = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^kubedrill:/.test(k) && !SKIP.test(k)) out.push(k); } } catch (e) { /* storage blocked */ } return out.sort(); }
  function exportAll() {
    var extra = {}; keys().forEach(function (k) { if (k !== 'kubedrill:v1') { try { extra[k] = localStorage.getItem(k); } catch (e) { /* ignore */ } } });
    return JSON.stringify({ app: 'kubedrill', format: 2, saved: new Date().toISOString(), progress: JSON.parse(KL.store.exportJSON()), extra: extra }, null, 2);
  }
  // returns a plain summary; throws on files that are not backups. nothing is written until apply() is called.
  function parse(txt) {
    var d = JSON.parse(txt);
    if (d && d.app === 'kubedrill' && d.format === 2 && d.progress && d.progress.v === 1 && d.extra && typeof d.extra === 'object') {
      var ex = {}; Object.keys(d.extra).forEach(function (k) { if (/^kubedrill:[a-z0-9_-]+$/i.test(k) && !SKIP.test(k) && k !== 'kubedrill:v1' && typeof d.extra[k] === 'string' && d.extra[k].length < 2e6) ex[k] = d.extra[k]; });
      var p = d.progress, labs = p.labs ? Object.keys(p.labs).length : 0;
      return { kind: 'full', progress: p, extra: ex, saved: d.saved || '', labs: labs, extraKeys: Object.keys(ex).length };
    }
    if (d && d.v === 1) return { kind: 'legacy', progress: d, extra: {}, saved: '', labs: d.labs ? Object.keys(d.labs).length : 0, extraKeys: 0 };
    throw new Error('Not a KubeDrill backup');
  }
  function apply(sum) {
    KL.store.importJSON(JSON.stringify(sum.progress));
    Object.keys(sum.extra).forEach(function (k) { try { localStorage.setItem(k, sum.extra[k]); } catch (e) { /* ignore */ } });
    return sum;
  }
  KL.progressIO = { keys: keys, exportAll: exportAll, parse: parse, apply: apply };
})();
