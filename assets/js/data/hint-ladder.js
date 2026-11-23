/* Hint ladder. A good hint sequence starts with a nudge, not the answer. Where a task has fewer than 3 hints, or its first hint already
   contains a full command, this prepends a generated level-1 nudge built from what the task's own check reads ("see what the check sees").
   The nudge never contains the fix: it names the object and field being checked and the command that shows it. Runs once at load, before variants
   are derived, so variants inherit it. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs; if (!Labs) return;
  function ns(a) { return a.ns ? ' in namespace `' + a.ns + '`' : ''; }
  function nudge(a) {
    switch (a.t) {
      case 'exists': return 'The check looks for `' + a.ref + '`' + ns(a) + '. Does it exist, in exactly that namespace? `kubectl get ' + a.ref.split('/')[0] + (a.ns ? ' -n ' + a.ns : '') + '`';
      case 'absent': return 'The check expects `' + a.ref + '` to be gone' + ns(a) + '. Is it still listed?';
      case 'jp': case 'jpRe': case 'qty': return 'The check reads the field `' + a.path + '` of `' + a.ref + '`' + ns(a) + '. Print exactly that and compare it with what the task asks for: `kubectl get ' + a.ref + (a.ns ? ' -n ' + a.ns : '') + ' -o jsonpath=\'{' + a.path + '}\'`';
      case 'podsReady': case 'count': case 'noNotReady': return 'The check counts pods' + (a.sel ? ' matching `' + a.sel + '`' : '') + ns(a) + '. How many are Running and Ready right now, and what does `kubectl describe` say about the ones that are not?';
      case 'endpoints': return 'The check looks at the endpoints of Service `' + a.svc + '`' + ns(a) + '. No endpoints means the selector matches nothing or the pods are not Ready: `kubectl get endpoints ' + a.svc + (a.ns ? ' -n ' + a.ns : '') + '`';
      case 'canI': return 'The check asks RBAC whether `' + a.as + '` can `' + a.verb + '` `' + a.res + '`' + ns(a) + '. Ask the same question yourself with `kubectl auth can-i` and `--as`.';
      case 'curl': return 'The check sends a request from `' + a.from + '` to `' + a.to + '`' + ns(a) + '. Send the same one with `kubectl exec` and read the exact error.';
      case 'file': case 'fileRe': case 'fileNo': return 'The check reads the file `' + a.path + '`. Open it with `cat` and compare it with what the task asks for.';
      case 'nodeCordoned': case 'podsOffNode': return 'The check reads the state of node `' + a.node + '`. `kubectl get nodes` and `kubectl get pods -o wide` show what it sees.';
      case 'probe': return 'The check runs `' + a.cmd + '` for you and looks at the result. Run it yourself first and read what comes back.';
      case 'event': return 'The check looks for a `' + a.reason + '` event on `' + a.kind + '/' + a.name + '`. `kubectl get events' + (a.ns ? ' -n ' + a.ns : '') + '` shows what exists.';
      default: return 'Before you change anything, find the read-only command (get, describe, logs or events) that shows the current state this task is about, and say what differs from what the task asks for.';
    }
  }
  function leaks(lab, h) { var s = String(h).toLowerCase().replace(/[`'"\s]+/g, ' '); return (lab.solution || []).some(function (c) { c = String(c).toLowerCase().replace(/[`'"\s]+/g, ' ').trim(); return c.length >= 25 && s.indexOf(c) >= 0; }); }
  var added = 0;
  Labs.list.forEach(function (lab) {
    (lab.tasks || []).forEach(function (t) {
      var hs = t.hints || (t.hints = []); if (t.ladder) return;
      if (hs.length >= 3 && !leaks(lab, hs[0])) return;
      var a = (t.assert || [])[0] || { t: '' }, n = nudge(a); if (!n) return;
      hs.unshift(n); t.ladder = true; added++;
      if (hs.length < 2) hs.push('Compare what the read-only command shows with the exact wording of the task. Change only the field that differs, then re-run the same command to confirm.');
    });
  });
  Labs.ladderAdded = added;
})(typeof window !== 'undefined' ? window : globalThis);
