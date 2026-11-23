/* Reading labs: builds the "evidence" a learner reads, by running real commands in the simulator against a lab's broken state.
   Pure and shared by the page and the tests. build(item, Sim, Labs) -> { text, lines[{t, hit}], right, wrong[] } */
(function (root) {
  var KL = root.KL = root.KL || {};
  var KEEP = /^(Name|Namespace|Node|Status|Image|Reason|Exit Code|Ready|Restart Count|Limits|Requests|cpu|memory|State|Last State|Port|Host Port|Liveness|Readiness|Startup|Selector|Type|IP|Endpoints|Events|Labels|Annotations|Taints|Unschedulable|Conditions|Allocated resources|Controlled By|Mounts|Environment|QoS Class|Node-Selectors|Tolerations)\b/;
  /** keep the diagnostic parts of the first object of a describe, and its Events block */
  function trimDescribe(out) {
    var blocks = String(out).split(/\n(?=Name:\s)/), b = blocks[0].split('\n'), keep = [], inEv = false, evN = 0;
    b.forEach(function (l) {
      if (/^Events:/.test(l)) inEv = true;
      if (inEv) { if (evN++ < 7) keep.push(l); return; }
      if (KEEP.test(l.replace(/^\s+/, '')) || /^\s+(Type|Status|cpu|memory)\b/.test(l)) keep.push(l);
    });
    return keep.join('\n') + (blocks.length > 1 ? '\n(' + (blocks.length - 1) + ' more object' + (blocks.length > 2 ? 's' : '') + ' not shown)' : '');
  }
  function build(item, Sim, Labs) {
    var lab = Labs.byId[item.lab], s = new Sim(); Labs.setup(s, lab); s.settle(30);
    var ns = lab.ns, parts = [];
    item.cmds.forEach(function (c) {
      var cmd = c.replace(/\{ns\}/g, ns), o = s.exec(cmd), t = (o.stdout + o.stderr).replace(/\s+$/, '');
      if (/^kubectl describe\b/.test(cmd) || /^k describe\b/.test(cmd)) t = trimDescribe(t);
      parts.push('$ ' + cmd + '\n' + t);
    });
    var re = new RegExp(item.ev, 'i'), text = parts.join('\n\n'), lines = text.split('\n').map(function (t) { return { t: t, hit: !/^\$ /.test(t) && re.test(t) }; });
    var D = KL.debrief || {};
    return { text: text, lines: lines, right: (D[item.lab] || [])[0], wrong: (item.wrong || []).map(function (w) { return (D[w] || [])[0]; }).filter(Boolean), lab: item.lab };
  }
  /** 1-based line numbers of b that break it: the first line whose trimmed text equals each entry of d.bad */
  function badLines(d) {
    var ls = d.b.replace(/\n$/, '').split('\n'), out = [];
    (d.bad || []).forEach(function (s) { for (var i = 0; i < ls.length; i++) if (ls[i].trim() === s) { out.push(i + 1); return; } });
    return out;
  }
  /** apply one version in a fresh simulator and return what the learner would see */
  function runDiff(d, which, Sim) {
    if (!d.sim) return null;
    var s = new Sim(); (d.sim.setup || []).forEach(function (c) { s.exec(c); });
    var o = s.exec("kubectl apply -f - <<'EOF'\n" + d[which].replace(/\n$/, '') + "\nEOF"); s.settle(30);
    var parts = ['$ kubectl apply -f ' + which + '.yaml\n' + (o.stdout + o.stderr).replace(/\s+$/, '')];
    (d.sim.show || []).forEach(function (c) { var r = s.exec(c); parts.push('$ ' + c + '\n' + (r.stdout + r.stderr).replace(/\s+$/, '')); });
    return parts.join('\n\n');
  }
  KL.readingCore = { build: build, trimDescribe: trimDescribe, badLines: badLines, runDiff: runDiff };
})(typeof window !== 'undefined' ? window : globalThis);
