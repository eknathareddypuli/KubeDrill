/* KubeDrill labs engine — declarative lab specs, auto-check against the simulator,
   and generation of equivalent bash (setup.sh / check.sh / reset.sh) for real kind clusters.
   One assertion DSL → two backends (JS for the simulator, bash for kubectl). */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {};
  var Labs = KL.Labs = { list: [], byId: {} };

  Labs.register = function (arr) { arr.forEach(function (l) { if (!Labs.byId[l.id]) { Labs.list.push(l); Labs.byId[l.id] = l; } }); };

  // ── simulator backend ──
  Labs.setup = function (sim, lab) {
    var ns = lab.ns;
    (lab.setupNs || [ns]).forEach(function (n) { if (!sim.get('Namespace', '', n)) sim.createRaw({ apiVersion: 'v1', kind: 'Namespace', metadata: { name: n } }); });
    var prev = sim.ctxNs;
    (lab.setup || []).forEach(function (txt) { var r = sim.exec('kubectl apply -f - <<EOF\n' + txt + '\nEOF'); if (r.code) throw new Error('lab ' + lab.id + ' setup failed: ' + r.stderr); });
    (lab.setupCmds || []).forEach(function (c) { var r = sim.exec(c); if (r.code) throw new Error('lab ' + lab.id + ' setup cmd failed: ' + c + ' → ' + r.stderr); });
    (lab.files || []).forEach(function (f) { sim.writeFile(f.path, f.content); });
    if (lab.flags) { sim.flags = JSON.parse(JSON.stringify(lab.flags)); }
    sim.ctxNs = lab.keepCtx ? prev : ns;
    if (sim.flags && sim.flags.contexts && sim.flags.current) { var c0 = sim.flags.contexts.filter(function (c) { return c.name === sim.flags.current; })[0]; if (c0 && c0.ns && c0.ns !== 'default') sim.ctxNs = c0.ns; } // a lab that starts on a named context starts in that context's namespace
    sim.settle(lab.settle || 8);
  };

  function ref(sim, a) { var p = String(a.ref).split('/'); return sim.get(p[0], a.ns, p[1]); }
  function pathVal(sim, o, path) { var v = sim.jsonpathVals(sim.exportObj(o), String(path).replace(/^\./, '')); return v.join(' '); }


  // ── checker reasons: say WHY an assertion fails, not just that it does ──
  function selStr(sel) { return Object.keys(sel || {}).map(function (k) { return k + '=' + sel[k]; }).join(','); }
  function labelsOf(p) { return selStr(p.metadata.labels); }
  function whyNot(sim, a, r) {
    var o, ps, i, w;
    switch (a.t) {
      case 'exists': { var d = sim.findKind(String(a.ref).split('/')[0]); if (!d) return ''; var nm = String(a.ref).split('/')[1], hits = sim.list(d.kind, null).filter(function (x) { return x.metadata.name === nm && x.metadata.namespace !== a.ns; }); return hits.length ? 'a ' + nm + ' exists in namespace "' + hits[0].metadata.namespace + '" instead (wrong namespace?)' : 'nothing named ' + nm + ' exists in any namespace'; }
      case 'absent': return 'it is still there; delete it, or check that you are in the right namespace and context';
      case 'endpoints': { o = sim.get('Service', a.ns, a.svc); if (!o) return ''; var sel = o.spec.selector || {}; if (!Object.keys(sel).length) return 'the Service has no selector, so nothing is selected'; ps = sim.list('Pod', a.ns, selStr(sel));
        if (!ps.length) { var all = sim.list('Pod', a.ns).slice(0, 3).map(function (p) { return p.metadata.name + ' [' + labelsOf(p) + ']'; }); return 'selector ' + selStr(sel) + ' matches 0 pods' + (all.length ? '; pods here carry: ' + all.join('; ') : '; there are no pods in this namespace'); }
        var nr = ps.filter(function (p) { return !sim.podReady(p); }); if (nr.length) return ps.length + ' pod(s) match the selector but ' + nr.length + ' not Ready (' + nr[0].metadata.name + ': ' + sim.podStatus(nr[0]) + '); not-ready pods are removed from the endpoints'; return ''; }
      case 'podsReady': ps = sim.list('Pod', a.ns, a.sel || null).filter(function (p) { return !(sim.podReady(p) && p.status.phase === 'Running'); }); if (!ps.length) return a.max !== undefined ? 'too many pods are Ready' : 'no pods match' + (a.sel ? ' ' + a.sel : '') + ' in ' + a.ns + ' (is the workload created, and in the right namespace?)';
        w = (sim.events || []).filter(function (e) { return e.ns === a.ns && e.name === ps[0].metadata.name && e.type === 'Warning'; }).pop(); return ps[0].metadata.name + ' is ' + sim.podStatus(ps[0]) + (w ? ' — ' + w.reason + ': ' + String(w.msg).slice(0, 110) : '');
      case 'curl': { var from = sim.get('Pod', a.ns, a.from); if (!from) return ''; var hp = String(a.to).split(':'), c = sim.connect(from, hp[0], parseInt(hp[1] || '80', 10)); if (a.ok === false) return c.code === 0 ? 'the request still succeeds: no NetworkPolicy is blocking it yet (or an allow rule is too broad)' : ''; if (c.code === 6 && (sim.list('NetworkPolicy', from.metadata.namespace) || []).some(function (np) { return (np.spec.policyTypes || []).indexOf('Egress') >= 0; })) return 'DNS cannot resolve ' + hp[0] + ' because an egress policy on the source pod blocks DNS: allow UDP/TCP 53 to CoreDNS in kube-system'; if (c.code === 6) return 'DNS cannot resolve ' + hp[0] + ' (does the Service exist, in this namespace?)'; if (c.code === 28 || /timed out/.test(c.out || '')) return 'the connection times out: a NetworkPolicy or egress rule is dropping it'; if (/refused/.test(c.out || '')) return 'connection refused: the Service has no ready endpoint or the port is wrong'; return c.out || ''; }
      case 'canI': return a.expect === false ? 'the subject is still allowed; find the Role/ClusterRole and binding that grants it (kubectl get rolebindings,clusterrolebindings -A)' : 'no Role/ClusterRole bound to this subject grants it; check the verb, the resource, the namespace and the binding subject';
      case 'noNotReady': return '';
      case 'jp': return '';
    }
    return '';
  }
  Labs.evalAssert = function (sim, a) {
    var r = evalRaw0(sim, a);
    if (!r.ok && !r.why) { try { var w = whyNot(sim, a, r); if (w) { r.why = w; r.msg = r.msg + ' — ' + w; } } catch (e) { /* diagnostics are best effort */ } }
    return r;
  };
  function evalRaw0(sim, a) {
    sim.fastForward && sim.fastForward();
    var o, v, n;
    switch (a.t) {
      case 'exists': return { ok: !!ref(sim, a), msg: a.ref + ' should exist in ' + a.ns };
      case 'absent': return { ok: !ref(sim, a), msg: a.ref + ' should not exist in ' + a.ns };
      case 'jp': o = ref(sim, a); if (!o) return { ok: false, msg: a.ref + ' not found in ' + a.ns };
        v = pathVal(sim, o, a.path);
        if (a.eq !== undefined) return { ok: v === String(a.eq), msg: a.ref + ' ' + a.path + ' should be "' + a.eq + '" (is "' + v + '")' };
        if (a.has !== undefined) return { ok: v.indexOf(a.has) >= 0, msg: a.ref + ' ' + a.path + ' should contain "' + a.has + '" (is "' + v + '")' };
        if (a.ne !== undefined) return { ok: v !== String(a.ne) && v !== '', msg: a.ref + ' ' + a.path + ' should not be "' + a.ne + '"' };
        return { ok: v !== '', msg: a.ref + ' ' + a.path + ' should be set' };
      case 'podsReady': n = sim.list('Pod', a.ns, a.sel || null).filter(function (p) { return sim.podReady(p) && p.status.phase === 'Running'; }).length;
        return { ok: n >= (a.min || 1) && (a.max === undefined || n <= a.max), msg: 'need ≥' + (a.min || 1) + ' Ready pods' + (a.sel ? ' with ' + a.sel : '') + ' in ' + a.ns + ' (have ' + n + ')' };
      case 'noNotReady': n = sim.list('Pod', a.ns, a.sel || null).filter(function (p) { return !p.metadata.deletionTimestamp && p.status.phase !== 'Succeeded' && !sim.podReady(p); }); return { ok: n.length === 0, msg: 'all pods in ' + a.ns + ' should be Ready (' + n.map(function (p) { return p.metadata.name + ':' + sim.podStatus(p); }).slice(0, 3).join(', ') + ')' };
      case 'count': n = sim.list(a.kind, a.ns, a.sel || null).length; return { ok: n >= (a.min || 0) && (a.max === undefined || n <= a.max), msg: 'expected ' + (a.min || 0) + '–' + (a.max === undefined ? '∞' : a.max) + ' ' + a.kind + ' in ' + a.ns + ' (have ' + n + ')' };
      case 'endpoints': o = sim.get('Service', a.ns, a.svc); if (!o) return { ok: false, msg: 'service ' + a.svc + ' not found' }; n = sim.endpointsFor(o).length; return { ok: n >= (a.min || 1), msg: 'service ' + a.svc + ' should have ≥' + (a.min || 1) + ' endpoints (has ' + n + ')' };
      case 'canI': { if (a.groups) { sim.flags = sim.flags || {}; sim.flags.userGroups = sim.flags.userGroups || {}; sim.flags.userGroups[a.as] = a.groups.slice(); } var yes = sim.canI(a.as, a.verb, a.res, a.ns); return { ok: yes === (a.expect !== false), msg: a.as.split(':').pop() + ' ' + (a.expect === false ? 'must NOT be able to ' : 'should be able to ') + a.verb + ' ' + a.res }; }
      case 'curl': { var from = sim.get('Pod', a.ns, a.from); if (!from || from.status.phase !== 'Running') return { ok: false, msg: 'client pod ' + a.from + ' is not running' }; var hp = String(a.to).split(':'), r = sim.connect(from, hp[0], parseInt(hp[1] || '80', 10)); return { ok: (r.code === 0) === (a.ok !== false), msg: a.from + ' → ' + a.to + (a.ok === false ? ' should be BLOCKED' : ' should succeed') }; }
      case 'qty': { o = ref(sim, a); if (!o) return { ok: false, msg: a.ref + ' not found in ' + a.ns }; v = pathVal(sim, o, a.path); var q0 = String(v), nq; if (a.kind === 'cpu') nq = /m$/.test(q0) ? parseFloat(q0) : parseFloat(q0) * 1000; else if (a.kind === 'mem') { var mm = q0.match(/^([\d.]+)(Ki|Mi|Gi|K|M|G)?$/); nq = mm ? parseFloat(mm[1]) * ({ Ki: 1 / 1024, Mi: 1, Gi: 1024, K: 1000 / 1048576, M: 1000000 / 1048576, G: 1e9 / 1048576 }[mm[2]] || 1 / 1048576) : NaN; } else nq = parseFloat(q0); var okq = !isNaN(nq) && (a.min === undefined || nq >= a.min) && (a.max === undefined || nq <= a.max); return { ok: okq, msg: a.msg || (a.ref + ' ' + a.path + ' should be ' + (a.min !== undefined ? '≥ ' + a.min : '') + (a.max !== undefined ? ' ≤ ' + a.max : '') + (a.kind === 'cpu' ? ' millicores' : a.kind === 'mem' ? ' MiB' : '') + ' (is "' + v + '")') }; }
      case 'ctx': { var cx = (sim.flags && sim.flags.contexts) || [], hit = a.name ? cx.filter(function (c) { return c.name === a.name; })[0] : null; if (a.current !== undefined) return { ok: !!sim.flags && sim.flags.current === a.current, msg: 'current context should be ' + a.current + ' (is ' + ((sim.flags && sim.flags.current) || 'none') + ')' }; var cn = hit && hit.name === sim.flags.current ? sim.ctxNs : hit && hit.ns; return { ok: !!hit && (a.ns === undefined || cn === a.ns) && (a.user === undefined || hit.user === a.user), msg: 'context ' + a.name + (hit ? ' should use ' + (a.user !== undefined ? 'user ' + a.user + ' and ' : '') + 'namespace ' + a.ns + ' (is ' + hit.user + ' / ' + cn + ')' : ' does not exist') }; }
      case 'fval': { var fv2 = sim.flags, ps = String(a.path).split('.'), qi; for (qi = 0; qi < ps.length && fv2 != null; qi++) fv2 = fv2[ps[qi]]; return { ok: String(fv2) === String(a.eq), msg: a.msg || (a.path + ' should be ' + a.eq + ' (now ' + fv2 + ')') }; }
      case 'flag': { var fv = sim.flags && sim.flags[a.k]; if (a.sub) fv = fv && fv[a.sub]; return { ok: !!fv === (a.v !== false), msg: a.msg || (a.k + (a.v === false ? ' should be cleared' : ' should be set')) }; }
      case 'kuser': { var cu = sim.flags && sim.flags.creds && sim.flags.creds[a.name]; return { ok: !!cu && (a.cn === undefined || (!!cu.subject && cu.subject.cn === a.cn)), msg: a.msg || ('kubeconfig user ' + a.name + (cu ? (a.cn !== undefined ? ' must carry a certificate issued for CN=' + a.cn : '') : ' does not exist (kubectl config set-credentials)')) }; }
      case 'nodeCordoned': o = sim.get('Node', '', a.node); return { ok: !!o && !!o.spec.unschedulable === (a.v !== false), msg: 'node ' + a.node + (a.v === false ? ' should be schedulable' : ' should be cordoned') };
      case 'podsOffNode': n = sim.list('Pod', a.ns).filter(function (p) { return p.spec.nodeName === a.node && !p.metadata.deletionTimestamp && (p.metadata.ownerReferences || []).length; }).length; return { ok: n === 0, msg: 'no ' + a.ns + ' pods should run on ' + a.node + ' (' + n + ' left)' };
      case 'jpRe': { o = ref(sim, a); if (!o) return { ok: false, msg: a.ref + ' not found in ' + a.ns }; v = pathVal(sim, o, a.path); return { ok: new RegExp(a.re).test(v), msg: a.msg || (a.ref + ' ' + a.path + ' should match /' + a.re + '/ (is "' + v + '")') }; }
      case 'fileNo': { var fn = sim.readFile(a.path); return { ok: fn !== null && !new RegExp(a.re, a.flags || '').test(fn), msg: a.msg || ('file ' + a.path + ' should not match /' + a.re + '/') }; }
      case 'fileRe': { var fc = sim.readFile(a.path); return { ok: fc !== null && new RegExp(a.re, a.flags || '').test(fc), msg: a.msg || ('file ' + a.path + (fc === null ? ' should exist' : ' should match /' + a.re + '/')) }; }
      case 'file': { var c = sim.readFile(a.path); return { ok: c !== null && (a.has === undefined || c.indexOf(a.has) >= 0), msg: 'file ' + a.path + ' should exist' + (a.has ? ' and contain "' + a.has + '"' : '') }; }
      case 'noQuotaErr': n = sim.list('ReplicaSet', a.ns).filter(function (r) { return sim.failedCreate && sim.failedCreate[r.metadata.uid]; }).length; return { ok: n === 0, msg: 'no ReplicaSet in ' + a.ns + ' should be failing admission' };
    }
    return { ok: false, msg: 'unknown assertion ' + a.t };
  }

  // hidden second fault: lab.stage2 = { apply:[yaml|cmd], applyCmds:[], reveal:'text', tasks:[...], solution:[...] }.
  // Stage-2 tasks only count once stage 2 has been triggered (sim.flags.stage2), which survives dump/load.
  Labs.stage2Active = function (sim, lab) { return !!(lab.stage2 && sim.flags && sim.flags.stage2); };
  Labs.allTasks = function (sim, lab) { return Labs.stage2Active(sim, lab) ? lab.tasks.concat(lab.stage2.tasks) : lab.tasks; };
  Labs.stage1Done = function (sim, lab) { return lab.tasks.every(function (t) { return (t.assert || []).every(function (a) { try { return Labs.evalAssert(sim, a).ok; } catch (e) { return false; } }); }); };
  Labs.applyStage2 = function (sim, lab) {
    var st = lab.stage2; if (!st || Labs.stage2Active(sim, lab)) return false;
    (st.apply || []).forEach(function (txt) { var r = sim.exec('kubectl apply -f - <<EOF\n' + txt + '\nEOF'); if (r.code) throw new Error('stage2 of ' + lab.id + ' failed: ' + r.stderr); });
    (st.applyCmds || []).forEach(function (c) { var r = sim.exec(c); if (r.code) throw new Error('stage2 cmd of ' + lab.id + ' failed: ' + c + ' → ' + r.stderr); });
    sim.flags = sim.flags || {}; sim.flags.stage2 = true; sim.settle(st.settle || 8); return true;
  };
  Labs.check = function (sim, lab) {
    sim.fastForward && sim.fastForward();
    var res = Labs.allTasks(sim, lab).map(function (t) {
      var rs = (t.assert || []).map(function (a) { var r; try { r = Labs.evalAssert(sim, a); } catch (e) { r = { ok: false, msg: 'check error: ' + e.message }; } r.a = a; return r; });
      return { id: t.id, ok: rs.every(function (r) { return r.ok; }), results: rs };
    });
    var cons = null;
    if (lab.constraint && lab.constraint.assert) {
      var cr = lab.constraint.assert.map(function (a) { try { return Labs.evalAssert(sim, a); } catch (e) { return { ok: false, msg: 'check error: ' + e.message }; } });
      cons = { ok: cr.every(function (r) { return r.ok; }), text: lab.constraint.text, msgs: cr.filter(function (r) { return !r.ok; }).map(function (r) { return r.msg; }) };
    }
    var allOk = res.every(function (r) { return r.ok; });
    return { tasks: res, passed: res.filter(function (r) { return r.ok; }).length, total: res.length, ok: allOk && (!cons || cons.ok), constraint: cons };
  };

  // ── bash backend (real cluster) ──
  function q(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
  var QTY_AWK = '{v=$1; if(v==""){exit 1} if(k=="cpu"){ if(v ~ /m$/){n=v+0}else{n=v*1000} } else if(k=="mem"){ n=v+0; if(match(v,/[A-Za-z]+$/)){u=substr(v,RSTART); if(u=="Ki")n=n/1024; else if(u=="Gi")n=n*1024; else if(u=="K")n=n*1000/1048576; else if(u=="M")n=n*1000000/1048576; else if(u=="G")n=n*1e9/1048576} else {n=n/1048576} } else {n=v+0} ok=1; if(mn!="" && n<mn+0)ok=0; if(mx!="" && n>mx+0)ok=0; exit ok?0:1}';
  function fpath(p) { return p.indexOf('/home/student/') === 0 ? '"$HOME/' + p.slice(14) + '"' : q(p); }
  Labs.bashAssert = function (a) {
    var ns = a.ns ? ' -n ' + a.ns : '';
    switch (a.t) {
      case 'exists': return 'kubectl get ' + a.ref + ns + ' >/dev/null 2>&1';
      case 'absent': return '! kubectl get ' + a.ref + ns + ' >/dev/null 2>&1';
      case 'jp': { var g = '"$(kubectl get ' + a.ref + ns + ' -o jsonpath=' + q('{' + a.path + '}') + ' 2>/dev/null)"'; if (a.eq !== undefined) return '[ ' + g + ' = ' + q(a.eq) + ' ]'; if (a.has !== undefined) return 'echo ' + g + ' | grep -q -- ' + q(a.has); if (a.ne !== undefined) return '[ -n ' + g + ' ] && [ ' + g + ' != ' + q(a.ne) + ' ]'; return '[ -n ' + g + ' ]'; }
      case 'podsReady': return '[ "$(kubectl get pods' + ns + (a.sel ? ' -l ' + a.sel : '') + ' -o jsonpath=' + q('{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\\n"}{end}') + ' 2>/dev/null | grep -c "Running true")" -ge ' + (a.min || 1) + ' ]' + (a.max !== undefined ? ' && [ "$(kubectl get pods' + ns + (a.sel ? ' -l ' + a.sel : '') + ' -o jsonpath=' + q('{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\\n"}{end}') + ' 2>/dev/null | grep -c "Running true")" -le ' + a.max + ' ]' : '');
      case 'noNotReady': return '! kubectl get pods' + ns + (a.sel ? ' -l ' + a.sel : '') + ' -o jsonpath=' + q('{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\\n"}{end}') + ' 2>/dev/null | grep -v "Succeeded" | grep -q -v "Running true"';
      case 'count': return '[ "$(kubectl get ' + a.kind + ns + (a.sel ? ' -l ' + a.sel : '') + ' --no-headers 2>/dev/null | wc -l)" -ge ' + (a.min || 0) + ' ]' + (a.max !== undefined ? ' && [ "$(kubectl get ' + a.kind + ns + (a.sel ? ' -l ' + a.sel : '') + ' --no-headers 2>/dev/null | wc -l)" -le ' + a.max + ' ]' : '');
      case 'endpoints': return '[ "$(kubectl get endpoints ' + a.svc + ns + ' -o jsonpath=' + q('{.subsets[*].addresses[*].ip}') + ' 2>/dev/null | wc -w)" -ge ' + (a.min || 1) + ' ]';
      case 'canI': return '[ "$(kubectl auth can-i ' + a.verb + ' ' + a.res + ' --as=' + a.as + (a.groups || []).map(function (g) { return ' --as-group=' + g; }).join('') + (a.all ? ' -A' : ns) + ' 2>/dev/null)" = ' + (a.expect === false ? 'no' : 'yes') + ' ]';
      case 'curl': return (a.ok === false ? '! ' : '') + 'kubectl exec' + ns + ' ' + a.from + ' -- wget -qO- -T 3 ' + a.to + ' >/dev/null 2>&1';
      case 'jpRe': { var g2 = '"$(kubectl get ' + a.ref + ns + ' -o jsonpath=' + q('{' + a.path + '}') + ' 2>/dev/null)"'; return 'echo ' + g2 + ' | grep -Eq -- ' + q(a.re); }
      case 'qty': { var gq = '"$(kubectl get ' + a.ref + ns + ' -o jsonpath=' + q('{' + a.path + '}') + ' 2>/dev/null)"'; return 'echo ' + gq + ' | awk -v k=' + (a.kind || 'num') + ' -v mn=' + (a.min !== undefined ? a.min : '""') + ' -v mx=' + (a.max !== undefined ? a.max : '""') + ' ' + q(QTY_AWK); }
      case 'ctx': if (a.name) return 'kubectl config get-contexts -o name | grep -qx ' + q(a.name) + (a.ns !== undefined ? ' && [ "$(kubectl config view -o jsonpath=' + q('{.contexts[?(@.name=="' + a.name + '")].context.namespace}') + ')" = ' + q(a.ns) + ' ]' : '') + (a.user !== undefined ? ' && [ "$(kubectl config view -o jsonpath=' + q('{.contexts[?(@.name=="' + a.name + '")].context.user}') + ')" = ' + q(a.user) + ' ]' : ''); return '[ "$(kubectl config current-context)" = ' + q(a.current) + ' ]';
      case 'kuser': return 'kubectl config get-users | grep -qx ' + q(a.name);
      case 'fval': return 'true # (simulator-only check)'
      case 'flag': return 'true # (simulator-only check)'
      case 'nodeCordoned': return '[ "$(kubectl get node ' + a.node + ' -o jsonpath=' + q('{.spec.unschedulable}') + ' 2>/dev/null)" ' + (a.v === false ? '!=' : '=') + ' "true" ]';
      case 'podsOffNode': return '[ "$(kubectl get pods' + ns + ' --field-selector spec.nodeName=' + a.node + ' --no-headers 2>/dev/null | wc -l)" -eq 0 ]';
      case 'file': return '[ -f ' + fpath(a.path) + ' ]' + (a.has ? ' && grep -q -F -- ' + q(a.has) + ' ' + fpath(a.path) : '');
      case 'fileRe': return '[ -f ' + fpath(a.path) + ' ] && grep -Eq -- ' + q(a.re) + ' ' + fpath(a.path);
      case 'fileNo': return '[ -f ' + fpath(a.path) + ' ] && ! grep -Eq -- ' + q(a.re) + ' ' + fpath(a.path);
      case 'noQuotaErr': return '! kubectl get events' + ns + ' 2>/dev/null | grep -qi "exceeded quota"';
    }
    return 'false';
  };
  Labs.genPack = function (lab) {
    var hdr = '#!/usr/bin/env bash\n# KubeDrill lab pack: ' + lab.title + ' (' + lab.id + ')\n# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).\nset -uo pipefail\n';
    var ns = lab.ns, nsList = lab.setupNs || [ns];
    var setup = hdr + 'echo "▶ Setting up lab: ' + lab.title.replace(/"/g, '') + '"\n' + nsList.map(function (n) { return 'kubectl create namespace ' + n + ' --dry-run=client -o yaml | kubectl apply -f -'; }).join('\n') + '\n' +
      (lab.setup || []).map(function (y) { return "kubectl apply -f - <<'KUBEDRILL_EOF'\n" + y.replace(/^\n/, '') + "\nKUBEDRILL_EOF"; }).join('\n') + '\n' + (lab.setupCmds || []).join('\n') + '\n' +
      (lab.files || []).map(function (f) { var hp = f.path.indexOf('/home/student/') === 0, rp = hp ? f.path.slice(14) : f.path, fq = hp ? '"$HOME/' + rp.replace(/(["$`\\])/g, '\\$1') + '"' : q(rp), dd = rp.indexOf('/') > 0 ? 'mkdir -p ' + (hp ? '"$HOME/' + rp.replace(/\/[^\/]*$/, '') + '"' : q(rp.replace(/\/[^\/]*$/, ''))) + '\n' : ''; return dd + "cat > " + fq + " <<'KUBEDRILL_EOF'\n" + f.content + "\nKUBEDRILL_EOF"; }).join('\n') + '\n' +
      'kubectl config set-context --current --namespace=' + ns + ' >/dev/null\necho "✔ Ready. Namespace: ' + ns + '. Read README.md, fix the cluster, then run ./check.sh"\n';
    var check = hdr + 'pass=0; fail=0\nchk() { # $1=task title, rest = condition\n  local title="$1"; shift\n  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi\n}\nsleep 1\n' +
      lab.tasks.map(function (t) { return 'echo ' + q('Task ' + t.id + ': ' + t.title) + '\nchk ' + q(t.title) + ' ' + q((t.assert || []).map(Labs.bashAssert).join(' && ')); }).join('\n') +
      (lab.constraint && lab.constraint.assert && lab.constraint.assert.length ? '\necho ' + q('Constraint: ' + lab.constraint.text) + '\nchk ' + q(lab.constraint.text) + ' ' + q(lab.constraint.assert.map(Labs.bashAssert).join(' && ')) : '') + '\necho; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail\n';
    var reset = hdr + 'echo "Removing lab namespaces…"\n' + nsList.map(function (n) { return 'kubectl delete namespace ' + n + ' --ignore-not-found'; }).join('\n') + '\n' + (lab.cleanupCmds || []).join('\n') + '\n';
    var readme = '# ' + lab.title + '\n\n**Track:** ' + lab.track.join(', ') + ' · **Level:** ' + lab.diff + ' · **Time:** ' + lab.time + ' · **Namespace:** `' + ns + '`\n\n' + lab.story + '\n\n## Tasks\n\n' + lab.tasks.map(function (t, i) { return (i + 1) + '. **' + t.title + '** — ' + t.desc; }).join('\n') + '\n\n## Run\n\n```bash\n./setup.sh   # create the broken environment\n# ...fix it with kubectl...\n./check.sh   # grade your work\n./reset.sh   # remove everything\n```\n\n## Hints\n\n' + lab.tasks.map(function (t, i) { return '<details><summary>Task ' + (i + 1) + ' hints</summary>\n\n' + (t.hints || []).map(function (h, j) { return (j + 1) + '. ' + h; }).join('\n') + '\n</details>'; }).join('\n\n') + '\n\n<details><summary>Solution</summary>\n\n```bash\n' + lab.solution.join('\n') + '\n```\n</details>\n';
    var solution = hdr + '# Spoiler: the reference solution for ' + lab.id + '. Try the lab first.\n' + (lab.solution || []).join('\n').replace(/\/home\/student\//g, '$HOME/') + '\n';
    return { 'setup.sh': setup, 'check.sh': check, 'reset.sh': reset, 'solution.sh': solution, 'README.md': readme };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Labs;
})(typeof window !== 'undefined' ? window : globalThis);
