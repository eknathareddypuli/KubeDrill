/* Simulator extras: etcd restore, static pods, RuntimeClass, CoreDNS Corefile, and a toy Helm.
   These are SCRIPTED models of node-level or tool-level behaviour: they follow the real command shapes and failure modes,
   but there is no real etcd, kubelet, sandbox runtime or Helm templating engine behind them. */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype;
  var Y = (typeof jsyaml !== 'undefined') ? jsyaml : require('js-yaml');
  function F(s) { return s.flags || (s.flags = {}); }
  function out(s, c) { return { stdout: s, stderr: '', code: c || 0 }; } function err(s, c) { return { stdout: '', stderr: s, code: c || 1 }; }
  var MAN = '/etc/kubernetes/manifests/';

  // ── command dispatch: etcdutl and helm ──
  var run0 = P.runCmd;
  P.runCmd = function (w, stdin) {
    if (w && w[0] === 'etcdutl') return this.etcdctl(w.slice(1));
    if (w && w[0] === 'helm') return this.helm(w.slice(1));
    if (w && w[0] === 'openssl' && w[1] === 'rand') { var n = parseInt(w[w.length - 1], 10) || 32, b64 = w.indexOf('-base64') >= 0, A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', k, o = '', sd = (this.seed = ((this.seed || 7) * 1103515245 + 12345) % 2147483647); var len = b64 ? Math.ceil(n / 3) * 4 : n * 2; for (k = 0; k < len; k++) { sd = (sd * 1103515245 + 12345) % 2147483647; o += (b64 ? A : '0123456789abcdef')[sd % (b64 ? 64 : 16)]; } if (b64 && n % 3) o = o.slice(0, len - (3 - n % 3)) + new Array(3 - n % 3 + 1).join('='); return out(o + '\n'); }
    var r = run0.call(this, w, stdin); this.syncStatic(); return r;
  };

  // ── etcd snapshot restore ──
  var etcd0 = P.etcdctl;
  P.etcdctl = function (a) {
    if (a[0] === 'snapshot' && a[1] === 'restore') {
      var file = a[2], di = -1, dir = null, i;
      for (i = 3; i < a.length; i++) { if (/^--data-dir=/.test(a[i])) dir = a[i].split('=')[1]; else if (a[i] === '--data-dir') dir = a[i + 1]; }
      void di;
      if (!file || file[0] === '-') return err('Error: snapshot path required: etcdctl snapshot restore <file> --data-dir <dir>\n');
      if (this.readFile(file) === null) return err('Error: open ' + file + ': no such file or directory\n');
      if (!dir) dir = 'default.etcd';
      dir = this.abs(dir);
      if (Object.keys(this.fs).some(function (k) { return k.indexOf(dir + '/member') === 0; })) return err('Error: data-dir "' + dir + '" not empty or unable to open: member already exists\n');
      this.fs[dir + '/member/snap/db'] = this.readFile(file); this.fs[dir + '/member/wal/0000000000000000-0000000000000000.wal'] = ''; this.changed();
      F(this).etcd = { restored: { file: this.abs(file), dir: dir } };
      return out('2026-01-01T10:00:00Z\tinfo\tsnapshot\tRestoring snapshot\t{"path": "' + file + '", "wal-dir": "' + dir + '/member/wal", "data-dir": "' + dir + '", "snap-dir": "' + dir + '/member/snap"}\n2026-01-01T10:00:00Z\tinfo\tsnapshot\trestored snapshot\t{"path": "' + file + '"}\n(The data directory is only a copy: the etcd static pod keeps using its old directory until you point its manifest at the new one.)\n');
    }
    return etcd0.apply(this, arguments);
  };
  // when the etcd manifest points at the restored directory, the cluster state "rolls back" to the snapshot
  P.reviveFromSnapshot = function () {
    var f = F(this), e = f.etcd; if (!e || !e.restored || e.applied) return;
    var man = this.readFile(MAN + 'etcd.yaml'); if (man === null) return;
    if (man.indexOf('path: ' + e.restored.dir) < 0) return;
    e.applied = true;
    var objs = (f.snapObjs || {})[e.restored.file] || [], self = this;
    objs.forEach(function (y) { self.exec('kubectl apply -f - <<EOF\n' + y + '\nEOF'); });
    this.settle(8);
  };
  var wf0 = P.writeFile;
  P.writeFile = function (p, c, append) { var r = wf0.call(this, p, c, append); try { if (this.abs(p).indexOf(MAN) === 0) { this.reviveFromSnapshot(); this.syncStatic(); } } catch (e) { /* ignore */ } return r; };

  // ── static pods: the kubelet turns manifests in /etc/kubernetes/manifests into mirror pods ──
  P.syncStatic = function () {
    var self = this, want = {}, node = 'cp1';
    if (!this.fs) return;
    Object.keys(this.fs).forEach(function (k) {
      if (k.indexOf(MAN) !== 0 || !/\.ya?ml$/.test(k)) return;
      var d; try { d = Y.load(self.fs[k]); } catch (e) { return; }
      if (!d || d.kind !== 'Pod' || !d.metadata || !d.metadata.name) return;
      var name = d.metadata.name + '-' + node, ns = d.metadata.namespace || 'default';
      var sys = self.get('Pod', ns, name); if (sys && !((sys.metadata.annotations || {})['kubernetes.io/config.source'])) return; // real control-plane pods are left alone
      want[ns + '/' + name] = { d: d, name: name, ns: ns, file: k };
    });
    this.list('Pod').forEach(function (p) {
      if ((p.metadata.annotations || {})['kubernetes.io/config.source'] !== 'file') return;
      var key = p.metadata.namespace + '/' + p.metadata.name, w = want[key];
      if (!w) { self.remove(p, true); return; }
      if (JSON.stringify(p.spec.containers.map(function (c) { return [c.name, c.image, c.command, c.args, c.resources || {}, c.env || []]; })) !== JSON.stringify((w.d.spec.containers || []).map(function (c) { return [c.name, c.image, c.command, c.args, c.resources || {}, c.env || []]; }))) { self.remove(p, true); } else delete want[key];
    });
    Object.keys(want).forEach(function (key) {
      var w = want[key], spec = JSON.parse(JSON.stringify(w.d.spec || {})); spec.nodeName = node;
      var meta = { name: w.name, namespace: w.ns, labels: Object.assign({}, w.d.metadata.labels || {}), annotations: { 'kubernetes.io/config.source': 'file', 'kubernetes.io/config.mirror': w.file } };
      var nd = self.get('Node', '', node); if (nd) meta.ownerReferences = [{ apiVersion: 'v1', kind: 'Node', name: node, uid: nd.metadata.uid, controller: true }];
      if (!self.get('Namespace', '', w.ns)) return;
      try { self.createRaw({ apiVersion: 'v1', kind: 'Pod', metadata: meta, spec: spec }); } catch (e) { /* ignore */ }
    });
  };

  // ── RuntimeClass: a pod naming a class that does not exist cannot start its sandbox ──
  var vp0 = P.volProblem;
  P.volProblem = function (pod) {
    var rc = pod.spec && pod.spec.runtimeClassName;
    if (rc && !this.get('RuntimeClass', '', rc)) return 'Failed to create pod sandbox: RuntimeClass "' + rc + '" not found';
    return vp0.apply(this, arguments);
  };
  var ev0 = P.ev;
  P.ev = function (o, type, reason, msg) { if (/^Failed to create pod sandbox: RuntimeClass/.test(msg || '')) reason = 'FailedCreatePodSandBox'; return ev0.call(this, o, type, reason, msg); };


  // ── environment variables are fixed when the container starts: a later ConfigMap/Secret edit must not change them ──
  var rec0 = P.reconcile;
  P.reconcile = function () {
    var r = rec0.apply(this, arguments), self = this;
    this.list('Pod').forEach(function (p) {
      var pi = self.pi && self.pi[p.metadata.uid]; if (!pi || pi.envSnap !== undefined) return;
      if (p.status && p.status.phase === 'Running' && self.podReady(p)) { try { pi.envSnap = podCmd0.call(self, p, 'env', []).stdout; } catch (e) { pi.envSnap = null; } }
    });
    return r;
  };
  var podCmd0 = P.podCmd;
  P.podCmd = function (pod, c, a) {
    if (c === 'env' || c === 'printenv') { var pi = this.pi && this.pi[pod.metadata.uid]; if (pi && typeof pi.envSnap === 'string') { var lines = pi.envSnap.replace(/\n$/, '').split('\n'); if (a && a[0]) return { stdout: lines.filter(function (x) { return x.indexOf(a[0] + '=') === 0; }).map(function (x) { return x.split('=').slice(1).join('='); }).join('\n') + '\n', stderr: '', code: 0 }; return { stdout: pi.envSnap, stderr: '', code: 0 }; } }
    return podCmd0.apply(this, arguments);
  };

  // ── CoreDNS: a Corefile without the kubernetes plugin cannot resolve Service names ──
  var rt0 = P.resolveTarget;
  P.resolveTarget = function (fromPod, host, port) {
    var cm = this.get('ConfigMap', 'kube-system', 'coredns');
    if (cm && cm.data && cm.data.Corefile !== undefined && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && !/(^|\s)kubernetes\s+cluster\.local\b/.test(cm.data.Corefile)) return { dns: false, msg: "bad address '" + host + "'" };
    return rt0.apply(this, arguments);
  };

  // ── toy Helm: one built-in chart (kd/web). Real Helm templating is NOT executed. ──
  var DEFAULTS = { replicaCount: 1, image: { repository: 'nginx', tag: '1.25' }, service: { port: 80, type: 'ClusterIP' }, resources: {} };
  function deep(o) { return JSON.parse(JSON.stringify(o)); }
  function merge(a, b) { Object.keys(b || {}).forEach(function (k) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]); else a[k] = deep(b[k]); }); return a; }
  function setPath(o, path, val) { var ps = path.split('.'), c = o, i; for (i = 0; i < ps.length - 1; i++) { if (typeof c[ps[i]] !== 'object' || c[ps[i]] === null) c[ps[i]] = {}; c = c[ps[i]]; } var v = val; if (/^-?\d+$/.test(val)) v = parseInt(val, 10); else if (val === 'true') v = true; else if (val === 'false') v = false; c[ps[ps.length - 1]] = v; }
  function render(rel, ns, vals) {
    var name = rel + '-web', lab = { app: name, 'app.kubernetes.io/instance': rel, 'app.kubernetes.io/managed-by': 'Helm' };
    var dep = { apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: name, namespace: ns, labels: lab }, spec: { replicas: vals.replicaCount, selector: { matchLabels: { app: name } }, template: { metadata: { labels: lab }, spec: { containers: [{ name: 'web', image: vals.image.repository + ':' + vals.image.tag, ports: [{ containerPort: 80 }] }] } } } };
    if (vals.resources && Object.keys(vals.resources).length) dep.spec.template.spec.containers[0].resources = vals.resources;
    var svc = { apiVersion: 'v1', kind: 'Service', metadata: { name: name, namespace: ns, labels: lab }, spec: { type: vals.service.type, selector: { app: name }, ports: [{ port: vals.service.port, targetPort: 80 }] } };
    return [dep, svc];
  }
  function stamp(s) { var m = Math.floor(s.t / 60), p2 = function (n) { return ('0' + n).slice(-2); }; return '2026-01-01 ' + p2(10 + Math.floor(m / 60) % 14) + ':' + p2(m % 60) + ':' + p2(s.t % 60) + ' +0000 UTC'; }
  P.helm = function (a) {
    var self = this, f = F(this), H = f.helm = f.helm || { repos: {}, rel: {} }, sub = a[0], ns = this.ctxNs || 'default', i, userVals = {}, positional = [], create = false, reuse = false, N;
    for (i = 1; i < a.length; i++) {
      var x = a[i];
      if (x === '-n' || x === '--namespace') ns = a[++i]; else if (/^--namespace=/.test(x)) ns = x.split('=')[1];
      else if (x === '--create-namespace') create = true; else if (x === '--reuse-values') reuse = true;
      else if (x === '--set' || x === '--set-string') { var kv = String(a[++i] || '').split(','); kv.forEach(function (p) { var q = p.split('='); if (q[0]) setPath(userVals, q[0], q.slice(1).join('=')); }); }
      else if (/^--set=/.test(x)) { x.slice(6).split(',').forEach(function (p) { var q = p.split('='); setPath(userVals, q[0], q.slice(1).join('=')); }); }
      else if (x === '-f' || x === '--values') { var txt = self.readFile(a[++i]); if (txt === null) return err('Error: open ' + a[i] + ': no such file or directory\n'); try { merge(userVals, Y.load(txt) || {}); } catch (e) { return err('Error: failed to parse ' + a[i] + '\n'); } }
      else if (x === '--wait' || x === '--atomic' || x === '--dry-run') { /* accepted, no effect */ }
      else if (x[0] !== '-') positional.push(x);
    }
    N = function (rel) { return ns + '/' + rel; };
    function chartOk(c) { if (c !== 'kd/web') return 'Error: INSTALLATION FAILED: chart "' + c + '" not found in repository (the simulator ships one chart: kd/web)\n'; if (!H.repos.kd) return 'Error: INSTALLATION FAILED: repo kd not found; add it first: helm repo add kd https://charts.kubedrill.example\n'; return ''; }
    function deploy(rel, rev, desc) {
      var vals = merge(deep(DEFAULTS), rev.values); var objs = render(rel, ns, vals);
      objs.forEach(function (o) { var r = self.exec('kubectl apply -f - <<EOF\n' + Y.dump(o) + '\nEOF'); if (r.code) throw new Error(r.stderr); });
      self.settle(6); void desc;
    }
    function table(rows) { var w = []; rows.forEach(function (r) { r.forEach(function (c, k) { w[k] = Math.max(w[k] || 0, String(c).length); }); }); return rows.map(function (r) { return r.map(function (c, k) { return k === r.length - 1 ? c : String(c) + new Array(w[k] - String(c).length + 3).join(' '); }).join(''); }).join('\n') + '\n'; }
    try {
      switch (sub) {
        case 'version': return out('version.BuildInfo{Version:"v3.16.0", GoVersion:"go1.22"} (simulated)\n');
        case 'repo':
          if (a[1] === 'add') { if (!a[2] || !a[3]) return err('Error: "helm repo add" requires 2 arguments\n'); H.repos[a[2]] = a[3]; return out('"' + a[2] + '" has been added to your repositories\n'); }
          if (a[1] === 'update') return out('Hang tight while we grab the latest from your chart repositories...\nUpdate Complete. ⎈Happy Helming!⎈\n');
          if (a[1] === 'list') return Object.keys(H.repos).length ? out(table([['NAME', 'URL']].concat(Object.keys(H.repos).map(function (k) { return [k, H.repos[k]]; })))) : err('Error: no repositories to show\n');
          return err('usage: helm repo add|update|list\n');
        case 'search': return H.repos.kd ? out(table([['NAME', 'CHART VERSION', 'APP VERSION', 'DESCRIPTION'], ['kd/web', '0.3.0', '1.25', 'A tiny web Deployment and Service']])) : out('No results found\n');
        case 'show': case 'inspect': if (positional[0] !== 'kd/web' && positional[1] !== 'kd/web') return err('Error: chart not found\n'); return out(Y.dump(DEFAULTS));
        case 'install': {
          var rel = positional[0], chart = positional[1]; if (!rel || !chart) return err('Error: "helm install" requires 2 arguments: NAME CHART\n');
          var ce = chartOk(chart); if (ce) return err(ce); if (H.rel[N(rel)]) return err('Error: INSTALLATION FAILED: cannot re-use a name that is still in use\n');
          if (!this.get('Namespace', '', ns)) { if (!create) return err('Error: INSTALLATION FAILED: create: failed to create: namespaces "' + ns + '" not found (use --create-namespace)\n'); this.createRaw({ apiVersion: 'v1', kind: 'Namespace', metadata: { name: ns } }); }
          var r1 = { rev: 1, status: 'deployed', values: userVals, updated: stamp(this), desc: 'Install complete' }; H.rel[N(rel)] = { revs: [r1] }; deploy(rel, r1);
          return out('NAME: ' + rel + '\nLAST DEPLOYED: ' + r1.updated + '\nNAMESPACE: ' + ns + '\nSTATUS: deployed\nREVISION: 1\n');
        }
        case 'upgrade': {
          var rel2 = positional[0], chart2 = positional[1]; if (!rel2 || !chart2) return err('Error: "helm upgrade" requires 2 arguments: RELEASE CHART\n');
          var rec = H.rel[N(rel2)]; var ce2 = chartOk(chart2); if (ce2) return err(ce2.replace('INSTALLATION', 'UPGRADE')); if (!rec) return err('Error: UPGRADE FAILED: "' + rel2 + '" has no deployed releases\n');
          var last = rec.revs[rec.revs.length - 1], v2 = reuse ? merge(deep(last.values), userVals) : userVals;
          rec.revs.forEach(function (r) { if (r.status === 'deployed') r.status = 'superseded'; });
          var r2 = { rev: last.rev + 1, status: 'deployed', values: v2, updated: stamp(this), desc: 'Upgrade complete' }; rec.revs.push(r2); deploy(rel2, r2);
          return out('Release "' + rel2 + '" has been upgraded. Happy Helming!\nNAME: ' + rel2 + '\nLAST DEPLOYED: ' + r2.updated + '\nNAMESPACE: ' + ns + '\nSTATUS: deployed\nREVISION: ' + r2.rev + '\n');
        }
        case 'rollback': {
          var rel3 = positional[0], rec3 = H.rel[N(rel3 || '')]; if (!rel3) return err('Error: "helm rollback" requires at least 1 argument: RELEASE [REVISION]\n'); if (!rec3) return err('Error: release: not found\n');
          var to = positional[1] ? parseInt(positional[1], 10) : rec3.revs[rec3.revs.length - 2] && rec3.revs[rec3.revs.length - 2].rev; var src = rec3.revs.filter(function (r) { return r.rev === to; })[0];
          if (!src) return err('Error: release has no ' + (positional[1] ? 'revision ' + positional[1] : 'previous revision') + '\n');
          rec3.revs.forEach(function (r) { if (r.status === 'deployed') r.status = 'superseded'; });
          var r3 = { rev: rec3.revs[rec3.revs.length - 1].rev + 1, status: 'deployed', values: deep(src.values), updated: stamp(this), desc: 'Rollback to ' + to }; rec3.revs.push(r3); deploy(rel3, r3);
          return out('Rollback was a success! Happy Helming!\n');
        }
        case 'uninstall': case 'delete': {
          var rel4 = positional[0]; if (!H.rel[N(rel4 || '')]) return err('Error: uninstall: Release not loaded: ' + rel4 + ': release: not found\n');
          delete H.rel[N(rel4)]; ['Deployment', 'Service'].forEach(function (k) { var o = self.get(k, ns, rel4 + '-web'); if (o) self.remove(o); }); self.settle(4); return out('release "' + rel4 + '" uninstalled\n');
        }
        case 'list': case 'ls': {
          var all = a.indexOf('-A') >= 0 || a.indexOf('--all-namespaces') >= 0, rows = [['NAME', 'NAMESPACE', 'REVISION', 'UPDATED', 'STATUS', 'CHART', 'APP VERSION']];
          Object.keys(H.rel).forEach(function (k) { var kp = k.split('/'); if (!all && kp[0] !== ns) return; var l = H.rel[k].revs[H.rel[k].revs.length - 1]; rows.push([kp[1], kp[0], l.rev, l.updated, l.status, 'web-0.3.0', '1.25']); });
          return out(table(rows));
        }
        case 'history': { var rec5 = H.rel[N(positional[0] || '')]; if (!rec5) return err('Error: release: not found\n'); return out(table([['REVISION', 'UPDATED', 'STATUS', 'CHART', 'APP VERSION', 'DESCRIPTION']].concat(rec5.revs.map(function (r) { return [r.rev, r.updated, r.status, 'web-0.3.0', '1.25', r.desc]; })))); }
        case 'status': { var rec6 = H.rel[N(positional[0] || '')]; if (!rec6) return err('Error: release: not found\n'); var l6 = rec6.revs[rec6.revs.length - 1]; return out('NAME: ' + positional[0] + '\nLAST DEPLOYED: ' + l6.updated + '\nNAMESPACE: ' + ns + '\nSTATUS: ' + l6.status + '\nREVISION: ' + l6.rev + '\n'); }
        case 'get': { if (a[1] !== 'values') return err('simulator: helm get supports only "values"\n'); var rec7 = H.rel[N(a.filter(function (x, k) { return k > 1 && x[0] !== '-' && a[k - 1] !== '-n'; })[0] || '')]; if (!rec7) return err('Error: release: not found\n'); var vv = rec7.revs[rec7.revs.length - 1].values; return out('USER-SUPPLIED VALUES:\n' + (Object.keys(vv).length ? Y.dump(vv) : 'null\n')); }
        default: return err('simulator: helm supports repo add/update/list, search repo, show values, install, upgrade, rollback, uninstall, list, history, status, get values. Chart: kd/web (a toy chart).\n');
      }
    } catch (e) { return err('Error: ' + e.message + '\n'); }
  };

  // ── DNS needs egress too: a pod whose egress is restricted cannot resolve names unless port 53 to CoreDNS is allowed ──
  var conn0 = P.connect;
  P.connect = function (fromPod, host, port) {
    if (host && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && fromPod && fromPod.metadata) {
      var dns = this.list('Pod', 'kube-system').filter(function (p) { return /coredns/.test(p.metadata.name) && p.status.phase === 'Running'; })[0];
      if (dns && !this.egressAllows(fromPod, dns, 53)) return { code: 6, out: "wget: bad address '" + host + "'", curl: 'curl: (6) Could not resolve host: ' + host };
    }
    return conn0.apply(this, arguments);
  };
})(typeof window !== 'undefined' ? window : globalThis);
