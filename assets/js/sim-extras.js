/* Simulator extras: etcd restore, static pods, RuntimeClass, CoreDNS Corefile, and a toy Helm.
   These are SCRIPTED models of node-level or tool-level behaviour: they follow the real command shapes and failure modes,
   but there is no real etcd, kubelet, sandbox runtime or Helm templating engine behind them. */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype;
  var Y = Sim.Y;
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

/* ── Control-plane fault layer (SCRIPTED) ──
   Real static-pod components are not simulated. Instead, when a lab sets flags.cp = true, each component manifest in
   /etc/kubernetes/manifests is checked for the mistakes that make the real binary exit (unknown flag, missing file, bad value),
   and the cluster behaves as it would with that component down:
     kube-scheduler down          -> new pods stay Pending with no events
     kube-controller-manager down -> no new ReplicaSets, pods, endpoints, PV binding or Job pods
     kube-apiserver down          -> every kubectl command is refused (use crictl and the manifest)
   It also models a missing CNI config (new pods stuck in ContainerCreating), a broken kube-proxy ConfigMap, and an etcd NOSPACE alarm.
   The log lines are plausible, not byte-exact. Shown as "Scripted" on the Fidelity page. */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype;
  var Y = (typeof jsyaml !== 'undefined') ? jsyaml : require('js-yaml');
  function F(s) { return s.flags || (s.flags = {}); }
  function out(s, c) { return { stdout: s, stderr: '', code: c || 0 }; } function err(s, c) { return { stdout: '', stderr: s, code: c || 1 }; }
  var MAN = '/etc/kubernetes/manifests/';
  var KNOWN = {
    'kube-scheduler': 'authentication-kubeconfig authorization-kubeconfig bind-address kubeconfig leader-elect config v secure-port profiling',
    'kube-controller-manager': 'allocate-node-cidrs authentication-kubeconfig authorization-kubeconfig bind-address client-ca-file cluster-cidr cluster-name cluster-signing-cert-file cluster-signing-key-file controllers kubeconfig leader-elect requestheader-client-ca-file root-ca-file service-account-private-key-file service-cluster-ip-range use-service-account-credentials v node-cidr-mask-size',
    'kube-apiserver': 'advertise-address allow-privileged authorization-mode client-ca-file enable-admission-plugins enable-bootstrap-token-auth etcd-cafile etcd-certfile etcd-keyfile etcd-servers kubelet-client-certificate kubelet-client-key kubelet-preferred-address-types proxy-client-cert-file proxy-client-key-file requestheader-allowed-names requestheader-client-ca-file requestheader-extra-headers-prefix requestheader-group-headers requestheader-username-headers secure-port service-account-issuer service-account-key-file service-account-signing-key-file service-cluster-ip-range tls-cert-file tls-private-key-file audit-policy-file audit-log-path audit-log-maxage audit-log-maxbackup audit-log-maxsize encryption-provider-config anonymous-auth profiling feature-gates v'
  };
  var PATHS = {
    'kube-scheduler': 'kubeconfig authentication-kubeconfig authorization-kubeconfig config',
    'kube-controller-manager': 'kubeconfig authentication-kubeconfig authorization-kubeconfig client-ca-file cluster-signing-cert-file cluster-signing-key-file requestheader-client-ca-file root-ca-file service-account-private-key-file',
    'kube-apiserver': 'client-ca-file etcd-cafile etcd-certfile etcd-keyfile kubelet-client-certificate kubelet-client-key proxy-client-cert-file proxy-client-key-file requestheader-client-ca-file service-account-key-file service-account-signing-key-file tls-cert-file tls-private-key-file audit-policy-file encryption-provider-config'
  };
  Object.keys(KNOWN).forEach(function (k) { var o = {}; KNOWN[k].split(' ').forEach(function (x) { o[x] = 1; }); KNOWN[k] = o; var p = {}; PATHS[k].split(' ').forEach(function (x) { p[x] = 1; }); PATHS[k] = p; });
  var AUTHZ = { Node: 1, RBAC: 1, Webhook: 1, ABAC: 1, AlwaysAllow: 1, AlwaysDeny: 1 };
  function hashId(s) { var h = 5381, i, o = ''; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; for (i = 0; i < 13; i++) { h = (h * 1103515245 + 12345) | 0; o += '0123456789abcdef'[(h >>> 16) & 15]; } return o; }
  function flagsOf(d) { var c = d && d.spec && d.spec.containers && d.spec.containers[0]; return c ? (c.command || []).concat(c.args || []).map(String) : []; }
  function cidrOk(v) { var m = String(v).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/); return !!m && [1, 2, 3, 4].every(function (i) { return +m[i] <= 255; }) && +m[5] <= 32; }

  /** The reason a control-plane component would exit, or null when its manifest looks fine. Only active when flags.cp is set. */
  P.cpProblem = function (comp) {
    if (!this.flags || !this.flags.cp) return null;
    var raw = this.fs && this.fs[MAN + comp + '.yaml']; if (raw == null) return 'manifest ' + MAN + comp + '.yaml not found: the kubelet has nothing to run';
    var d; try { d = Y.load(raw); } catch (e) { return 'manifest is not valid YAML'; }
    var self = this, bad = null;
    flagsOf(d).forEach(function (tok) {
      if (bad || tok.indexOf('--') !== 0) return; var i = tok.indexOf('='), n = tok.slice(2, i < 0 ? undefined : i), v = i < 0 ? '' : tok.slice(i + 1);
      if (!KNOWN[comp][n]) { bad = 'Error: unknown flag: --' + n; return; }
      if (PATHS[comp][n] && v && self.fs[v] == null) { bad = comp === 'kube-apiserver' && /^etcd-/.test(n) ? 'Error: unable to load etcd client certificate: open ' + v + ': no such file or directory' : 'Error: open ' + v + ': no such file or directory'; return; }
      if (n === 'authorization-mode') v.split(',').forEach(function (m) { if (!bad && !AUTHZ[m]) bad = 'Error: unknown authorization mode ' + m + ' specified'; });
      if ((n === 'service-cluster-ip-range' || n === 'cluster-cidr') && !cidrOk(v)) bad = 'Error: invalid --' + n + ' "' + v + '": invalid CIDR address';
      if (n === 'etcd-servers' && comp === 'kube-apiserver') {
        var em = self.fs[MAN + 'etcd.yaml'], ok = ['127.0.0.1:2379', 'localhost:2379'];
        if (em) { try { flagsOf(Y.load(em)).forEach(function (t) { var m = t.match(/^--listen-client-urls=(.*)$/); if (m) ok = m[1].split(',').map(function (u) { return u.replace(/^https?:\/\//, ''); }); }); } catch (e) { /* ignore */ } }
        v.split(',').forEach(function (u) { if (!bad && ok.indexOf(u.replace(/^https?:\/\//, '')) < 0) bad = 'W1123 10:01:09.202116       1 logging.go:59] [core] grpc: addrConn.createTransport failed to connect to {Addr: "' + u.replace(/^https?:\/\//, '') + '"}. Err: connection error: desc = "transport: Error while dialing: dial tcp ' + u.replace(/^https?:\/\//, '') + ': connect: connection refused"\nF1123 10:01:29.205310       1 storage_decorator.go:57] Unable to create storage backend: config (&{ /registry [' + u + '] }), err (context deadline exceeded)'; });
      }
    });
    return bad;
  };
  P.cpDown = function (comp) { return !!this.cpProblem(comp); };

  // ── what the container does: a control-plane mirror pod, or kube-proxy, may exit with the reason in its logs ──
  var plan0 = P.containerPlan;
  P.containerPlan = function (pod, c) {
    var plan = plan0.apply(this, arguments);
    if (!this.flags || !this.flags.cp || !pod.metadata) return plan;
    var nm = pod.metadata.name || '', m = nm.match(/^(kube-apiserver|kube-controller-manager|kube-scheduler)-cp1$/), why = null;
    if (m && (pod.metadata.annotations || {})['kubernetes.io/config.source'] === 'file') why = this.cpProblem(m[1]);
    else if ((pod.metadata.labels || {})['k8s-app'] === 'kube-proxy' && pod.metadata.namespace === 'kube-system') {
      // kube-proxy reads its config once, when the process starts: a pod keeps the configuration it started with until it is replaced
      var snap = this._kpSnap = this._kpSnap || {}, cm0 = this.get('ConfigMap', 'kube-system', 'kube-proxy'); if (!(pod.metadata.uid in snap)) snap[pod.metadata.uid] = cm0 ? JSON.parse(JSON.stringify(cm0)) : null;
      var cm = snap[pod.metadata.uid], cfg = null; try { cfg = cm && Y.load((cm.data || {})['config.conf']); } catch (e) { why = 'Error: failed to parse the kube-proxy configuration: ' + e.message.split('\n')[0]; }
      if (!why && cfg) {
        if (cfg.mode && ['iptables', 'ipvs', 'nftables', 'kernelspace'].indexOf(cfg.mode) < 0) why = 'E1123 10:03:12.512903       1 server.go:66] "Failed to create proxier" err="unknown proxy mode \\"' + cfg.mode + '\\""\nError: unknown proxy mode "' + cfg.mode + '"';
        else if (cfg.clusterCIDR && !cidrOk(String(cfg.clusterCIDR).split(',')[0])) why = 'E1123 10:03:12.512903       1 server.go:73] "Invalid configuration" err="clusterCIDR: invalid CIDR address: ' + cfg.clusterCIDR + '"';
      }
    }
    if (why) { plan.exit = { code: 1, reason: 'Error' }; plan.logs = why.split('\n'); }
    return plan;
  };


  // with flags.cp the default control-plane pods are replaced by mirror pods built from the manifests, so editing a manifest really changes them
  var ss1 = P.syncStatic;
  P.syncStatic = function () {
    if (this.flags && this.flags.cp) { var self = this; ['kube-apiserver', 'kube-controller-manager', 'kube-scheduler', 'etcd'].forEach(function (c) { var p = self.get('Pod', 'kube-system', c + '-cp1'); if (p && !((p.metadata.annotations || {})['kubernetes.io/config.source']) && self.fs && self.fs[MAN + c + '.yaml'] != null) self.remove(p, true); }); }
    return ss1.apply(this, arguments);
  };
  var rec1 = P.reconcile;
  P.reconcile = function () { if (this.flags && this.flags.cp) this.syncStatic(); return rec1.apply(this, arguments); };

  // ── a missing CNI config: new (non host-network) pods cannot get a sandbox ──
  var vp1 = P.volProblem;
  P.volProblem = function (pod) {
    var f = this.flags;
    if (f && f.cp && f.cni && pod.spec && !pod.spec.hostNetwork) {
      var ok = false, self = this;
      Object.keys(this.fs || {}).forEach(function (k) { if (/^\/etc\/cni\/net\.d\/[^/]+\.(conf|conflist|json)$/.test(k)) { try { var j = JSON.parse(self.fs[k]); if (j && j.cniVersion && (j.plugins || j.type)) ok = true; } catch (e) { /* invalid JSON does not count */ } } });
      if (!ok) return 'Failed to create pod sandbox: rpc error: code = Unknown desc = failed to setup network for sandbox: no valid networks found in /etc/cni/net.d';
    }
    return vp1.apply(this, arguments);
  };
  var ev1 = P.ev;
  P.ev = function (o, type, reason, msg) { if (/^Failed to create pod sandbox: rpc error/.test(msg || '')) reason = 'FailedCreatePodSandBox'; return ev1.call(this, o, type, reason, msg); };

  // ── commands: crictl, etcdctl health/alarm/compact/defrag, kubectl refused or blocked ──
  var MUT = /^(create|apply|delete|replace|patch|label|annotate|scale|set|expose|run|rollout|cordon|uncordon|drain|taint|edit|autoscale|cp|certificate|auth\s+reconcile)$/;
  function comps(s) { return ['kube-apiserver', 'kube-controller-manager', 'kube-scheduler'].filter(function (c) { return s.fs && s.fs[MAN + c + '.yaml'] != null; }); }
  var run1 = P.runCmd;
  P.runCmd = function (w, stdin) {
    var f = this.flags;
    if (w && f && f.cp && !this._cpSetup) {
      var c = w[0] === 'k' ? 'kubectl' : w[0], a = w.slice(1);
      if (c === 'kubectl') {
        if (this.cpDown('kube-apiserver')) return err('The connection to the server cp1:6443 was refused - did you specify the right host or port?\n');
        var verb = a.filter(function (x) { return x[0] !== '-'; })[0] || '';
        if (f.etcdDb && f.etcdDb.alarm && MUT.test(verb) && !a.some(function (x) { return /^--dry-run/.test(x); })) return err('Error from server: etcdserver: mvcc: database space exceeded\n');
      }
      if (c === 'crictl' && (a[0] === 'ps' || a[0] === 'logs' || a[0] === 'pods')) return this.crictl(a);
      if (c === 'etcdctl') { var js = a.join(' ').indexOf('json') >= 0, b = a.filter(function (x) { return x.indexOf('-') !== 0 && x !== 'json' && x !== 'table'; }); if (/^(endpoint|alarm|compact|defrag|member)$/.test(b[0] || '')) return this.etcdAdmin(b.concat(js ? ['json'] : [])); }
    }
    return run1.apply(this, arguments);
  };
  P.crictl = function (a) {
    var self = this, rows = comps(this).map(function (c) { var bad = self.cpProblem(c), tries = bad ? 6 : 0, id = hashId(c + (bad ? 'x' : 'ok')); return { c: c, id: id, state: bad ? 'Exited' : 'Running', tries: tries, why: bad, pod: c + '-cp1' }; });
    if (a[0] === 'logs') { var id = a.filter(function (x) { return x[0] !== '-'; })[1]; var r = rows.filter(function (x) { return x.id.indexOf(id || '#') === 0; })[0]; if (!r) return err('E1123 10:05:00.000000    4821 remote_runtime.go:415] "ContainerStatus from runtime service failed" err="rpc error: code = NotFound desc = an error occurred when try to find container \\"' + id + '\\": not found"\nFATA[0000] rpc error: code = NotFound desc = an error occurred when try to find container "' + id + '": not found\n'); return out(r.why ? r.why + '\n' : 'I1123 10:00:01.000000       1 ' + r.c + '.go:1] started\n'); }
    if (a[0] === 'pods') return out('POD ID             CREATED             STATE               NAME                           NAMESPACE           ATTEMPT\n' + rows.map(function (r) { return r.id.slice(0, 13) + '   10 minutes ago      Ready               ' + (r.pod + '                              ').slice(0, 30) + ' kube-system         ' + r.tries; }).join('\n') + '\n');
    var all = a.indexOf('-a') >= 0 || a.indexOf('--all') >= 0, list = rows.filter(function (r) { return all || r.state === 'Running'; });
    return out('CONTAINER           IMAGE               CREATED             STATE               NAME                      ATTEMPT             POD ID              POD\n' + list.map(function (r) { return r.id.slice(0, 13) + '   a1b2c3d4e5f6a       ' + (r.state === 'Running' ? '10 minutes ago' : '45 seconds ago') + '      ' + (r.state + '              ').slice(0, 20) + (r.c + '                          ').slice(0, 26) + '' + (String(r.tries) + '                  ').slice(0, 20) + r.id.slice(3, 16) + '    ' + r.pod; }).join('\n') + '\n');
  };
  P.etcdAdmin = function (a) {
    var f = F(this), d = f.etcdDb; if (!d) return err('Error: etcd is not reachable from this shell\n');
    var QUOTA = 2147483648;
    if (a[0] === 'endpoint' && a[1] === 'health') return out('https://127.0.0.1:2379 is healthy: successfully committed proposal: took = 9.8ms\n');
    if (a[0] === 'endpoint' && a[1] === 'status') {
      var js = a.join(' ').indexOf('json') >= 0;
      if (js) return out(JSON.stringify([{ Endpoint: 'https://127.0.0.1:2379', Status: { header: { cluster_id: 14841639068965178418, member_id: 10276657743932975437, revision: d.rev, raft_term: 3 }, version: '3.5.15', dbSize: d.size, leader: 10276657743932975437, raftIndex: 20491, raftTerm: 3, raftAppliedIndex: 20491, dbSizeInUse: d.compacted >= d.rev ? Math.round(d.size / 40) : d.size, errors: d.alarm ? ['memberID:10276657743932975437 alarm:NOSPACE '] : [] } }]) + '\n');
      return out('+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+\n|        ENDPOINT        |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX | ERRORS |\n+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+\n| https://127.0.0.1:2379 | 8e9e05c52164694d |  3.5.15 | ' + (d.size / 1073741824).toFixed(1) + ' GB |      true |      false |         3 |      20491 |              20491 | ' + (d.alarm ? 'alarm:NOSPACE' : '') + ' |\n+------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+\n');
    }
    if (a[0] === 'member' && a[1] === 'list') return out('8e9e05c52164694d, started, cp1, https://127.0.0.1:2380, https://127.0.0.1:2379, false\n');
    if (a[0] === 'alarm' && a[1] === 'list') return out(d.alarm ? 'memberID:10276657743932975437 alarm:NOSPACE \n' : '');
    if (a[0] === 'alarm' && a[1] === 'disarm') { if (d.alarm && d.size >= QUOTA) return out('memberID:10276657743932975437 alarm:NOSPACE \n'); d.alarm = false; this.changed(); return out(''); }
    if (a[0] === 'compact') { var rv = parseInt(a[1], 10); if (!(rv > 0)) return err('Error: revision required: etcdctl compact <revision>\n'); if (rv > d.rev) return err('Error: etcdserver: mvcc: required revision is a future revision\n'); if (rv <= d.compacted) return err('Error: etcdserver: mvcc: required revision has been compacted\n'); d.compacted = rv; this.changed(); return out('compacted revision ' + rv + '\n'); }
    if (a[0] === 'defrag') { if (d.compacted < d.rev - 1000) return out('Finished defragmenting etcd member[https://127.0.0.1:2379]\n'); d.size = Math.round(d.size / 40); this.changed(); return out('Finished defragmenting etcd member[https://127.0.0.1:2379]\n'); }
    return err('Error: unknown etcdctl command\n');
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ── kustomize configMapGenerator / secretGenerator (literals and files): generated name gets a content hash suffix unless
   generatorOptions.disableNameSuffixHash is set, and references to it in workloads are rewritten, as the real tool does. The hash is
   illustrative, not byte-identical to kustomize's. ── */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, Y = Sim.Y, U = Sim.util;
  var kb0 = P.kustomizeBuild;
  P.kustomizeBuild = function (dir) {
    var docs = kb0.apply(this, arguments), self = this, base = this.abs(dir), kf = [base + '/kustomization.yaml', base + '/kustomization.yml'].filter(function (p) { return p in self.fs; })[0];
    var k = kf ? (Y.load(this.fs[kf]) || {}) : {}, gens = [];
    (k.configMapGenerator || []).forEach(function (g) { gens.push(['ConfigMap', g]); }); (k.secretGenerator || []).forEach(function (g) { gens.push(['Secret', g]); });
    if (!gens.length) return docs;
    var nosuf = k.generatorOptions && k.generatorOptions.disableNameSuffixHash, map = {};
    gens.forEach(function (e) {
      var kind = e[0], g = e[1], data = {}, ns = k.namespace;
      (g.literals || []).forEach(function (l) { var i = l.indexOf('='); data[l.slice(0, i)] = l.slice(i + 1); });
      (g.files || []).forEach(function (f) { var i = f.indexOf('='), key = i < 0 ? f.split('/').pop() : f.slice(0, i), path = base + '/' + (i < 0 ? f : f.slice(i + 1)); if (!(path in self.fs)) throw new Sim.KErr('error: accumulating resources: accumulation err=\'merging resources from \'' + f + '\': evalsymlink failure on \'' + path + '\''); data[key] = self.fs[path]; });
      var name = (k.namePrefix || '') + g.name + (k.nameSuffix || ''), suf = nosuf || (g.options && g.options.disableNameSuffixHash) ? '' : '-' + U.hash(JSON.stringify(data)).toString(36).padEnd(10, 'k').slice(0, 10), full = name + suf;
      if (kind === 'Secret') Object.keys(data).forEach(function (kk) { data[kk] = (typeof Buffer !== 'undefined' ? Buffer.from(data[kk]).toString('base64') : btoa(data[kk])); });
      var o = { apiVersion: 'v1', kind: kind, metadata: { name: full }, data: data }; if (kind === 'Secret') o.type = 'Opaque'; if (ns) o.metadata.namespace = ns;
      map[kind + '/' + g.name] = full; docs.push(o);
    });
    docs.forEach(function (d) {
      var ps = d.spec && d.spec.template && d.spec.template.spec; if (!ps) return;
      (ps.volumes || []).forEach(function (v) { if (v.configMap && map['ConfigMap/' + v.configMap.name]) v.configMap.name = map['ConfigMap/' + v.configMap.name]; if (v.secret && map['Secret/' + v.secret.secretName]) v.secret.secretName = map['Secret/' + v.secret.secretName]; });
      (ps.containers || []).forEach(function (c) {
        (c.envFrom || []).forEach(function (e) { if (e.configMapRef && map['ConfigMap/' + e.configMapRef.name]) e.configMapRef.name = map['ConfigMap/' + e.configMapRef.name]; if (e.secretRef && map['Secret/' + e.secretRef.name]) e.secretRef.name = map['Secret/' + e.secretRef.name]; });
        (c.env || []).forEach(function (e) { var vf = e.valueFrom || {}; if (vf.configMapKeyRef && map['ConfigMap/' + vf.configMapKeyRef.name]) vf.configMapKeyRef.name = map['ConfigMap/' + vf.configMapKeyRef.name]; if (vf.secretKeyRef && map['Secret/' + vf.secretKeyRef.name]) vf.secretKeyRef.name = map['Secret/' + vf.secretKeyRef.name]; });
      });
    });
    return docs;
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* A Service whose targetPort is a NAME only selects pods that declare a container port with that name. */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, ep0 = P.endpointsFor;
  P.endpointsFor = function (svc) {
    var self = this, pods = ep0.apply(this, arguments), ports = (svc.spec && svc.spec.ports) || [];
    if (!ports.some(function (sp) { return typeof sp.targetPort === 'string' && !/^\d+$/.test(sp.targetPort); })) return pods;
    return pods.filter(function (p) { return ports.every(function (sp) { return self.targetPortOf(svc, sp, p) != null; }); });
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* `kubectl events` and `kubectl get events` with the filters people actually use: --types, --for, --field-selector (type, reason,
   involvedObject.name / .kind), and --sort-by (events are already in time order). */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype;
  function table(h, rows) { var w = h.map(function (x, i) { return Math.max(x.length, rows.reduce(function (m, r) { return Math.max(m, String(r[i]).length); }, 0)); }); return [h].concat(rows).map(function (r) { return r.map(function (c, i) { return i === r.length - 1 ? c : String(c) + new Array(w[i] - String(c).length + 4).join(' '); }).join(''); }).join('\n') + '\n'; }
  var ke0 = P.kEvents;
  P.kEvents = function (a) {
    var f = a.flags || {}, ns = f['all-namespaces'] || f.A ? null : (f.n || this.ctxNs), self = this, flt = [];
    if (f.types) flt.push(['type', String(f.types)]);
    if (f['field-selector']) String(f['field-selector']).split(',').forEach(function (p) { var i = p.indexOf('='); if (i > 0) flt.push([p.slice(0, i).replace(/!$/, ''), p.slice(i + 1).replace(/^=/, '')]); });
    if (f['for']) { var fp = String(f['for']).split('/'); if (fp.length === 2) { flt.push(['involvedObject.kind', fp[0]]); flt.push(['involvedObject.name', fp[1]]); } }
    if (!flt.length) return ke0.apply(this, arguments);
    var evs = this.events.filter(function (e) {
      if (ns && e.ns !== ns) return false;
      return flt.every(function (x) { var k = x[0], v = x[1], vals = v.split(','); if (k === 'type') return vals.some(function (y) { return y.toLowerCase() === e.type.toLowerCase(); }); if (k === 'reason') return e.reason === v; if (k === 'involvedObject.name') return e.name === v; if (k === 'involvedObject.kind') return e.kind.toLowerCase() === v.toLowerCase(); return true; });
    });
    if (!evs.length) return 'No resources found in ' + (ns || 'all') + ' namespace.\n';
    return table(['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE'], evs.slice(-40).map(function (e) { return [self.fmtAge(e.t), e.type, e.reason, e.kind.toLowerCase() + '/' + e.name, e.msg]; }));
  };
  var kg0 = P.kGet;
  P.kGet = function (a) {
    if (a.pos && /^(events?|ev)$/.test(a.pos[0] || '') && a.pos.length === 1 && !(a.flags && a.flags.o)) return this.kEvents(a);
    return kg0.apply(this, arguments);
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ── CKS node-hardening helpers (SCRIPTED): file modes and owners, seccomp Localhost profiles, AppArmor profiles.
   Modes/owners are tracked per path in flags.fmeta (default 644 root:root); chmod (numeric or u/g/o/a +-= rwx), chown, stat -c and ls -l work on them.
   A pod that asks for a seccomp Localhost profile needs the file under /var/lib/kubelet/seccomp/, and one that asks for an AppArmor Localhost
   profile needs it loaded with apparmor_parser -r (listed by aa-status). No kernel enforcement is simulated. ── */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype;
  function out(s, c) { return { stdout: s, stderr: '', code: c || 0 }; } function err(s, c) { return { stdout: '', stderr: s, code: c || 1 }; }
  function F(s) { return s.flags || (s.flags = {}); }
  P.fileMeta = function (p) { var f = F(this), a = this.abs(p), m = f.fmeta && f.fmeta[a]; return { mode: (m && m.mode) || '644', owner: (m && m.owner) || 'root:root' }; };
  function exists(s, p) { var a = s.abs(p); return a in s.fs || s.isDir(a); }
  function setMeta(s, p, k, v) { var f = F(s), a = s.abs(p); f.fmeta = f.fmeta || {}; f.fmeta[a] = f.fmeta[a] || { mode: (f.fmeta[a] || {}).mode || (s.isDir(a) && !(a in s.fs) ? '755' : '644'), owner: 'root:root' }; f.fmeta[a][k] = v; s.changed(); }
  function modeFlags(mode) { var n = parseInt(mode, 8), o = ''; [6, 3, 0].forEach(function (sh) { var b = (n >> sh) & 7; o += (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-'); }); return o; }
  function symbolic(cur, spec) {
    var n = parseInt(cur, 8), parts = spec.split(','), ok = true;
    parts.forEach(function (p) { var m = p.match(/^([ugoa]*)([+\-=])([rwx]*)$/); if (!m) { ok = false; return; } var who = m[1] || 'a', bits = (m[3].indexOf('r') >= 0 ? 4 : 0) | (m[3].indexOf('w') >= 0 ? 2 : 0) | (m[3].indexOf('x') >= 0 ? 1 : 0); if (who.indexOf('a') >= 0) who = 'ugo'; ['u', 'g', 'o'].forEach(function (w) { if (who.indexOf(w) < 0) return; var sh = w === 'u' ? 6 : w === 'g' ? 3 : 0; if (m[2] === '+') n |= bits << sh; else if (m[2] === '-') n &= ~(bits << sh); else n = (n & ~(7 << sh)) | (bits << sh); }); });
    return ok ? n.toString(8) : null;
  }
  var run2 = P.runCmd;
  P.runCmd = function (w, stdin) {
    var c = w && w[0], a = w ? w.slice(1) : [], self = this, f = F(this);
    if (c === 'chmod') {
      var args = a.filter(function (x) { return x !== '-R' && x !== '--recursive'; }), mode = args[0], files = args.slice(1), rec = a.indexOf('-R') >= 0;
      if (!mode || !files.length) return err("chmod: missing operand\nTry 'chmod --help' for more information.\n");
      for (var i = 0; i < files.length; i++) {
        if (!exists(this, files[i])) return err("chmod: cannot access '" + files[i] + "': No such file or directory\n");
        var targets = [this.abs(files[i])]; if (rec) Object.keys(this.fs).forEach(function (k) { if (k.indexOf(self.abs(files[i]) + '/') === 0) targets.push(k); });
        for (var j = 0; j < targets.length; j++) { var nm = /^[0-7]{3,4}$/.test(mode) ? mode.slice(-3) : symbolic(this.fileMeta(targets[j]).mode, mode); if (nm === null) return err("chmod: invalid mode: '" + mode + "'\nTry 'chmod --help' for more information.\n"); setMeta(this, targets[j], 'mode', nm); }
      }
      return out('');
    }
    if (c === 'chown') {
      var ca = a.filter(function (x) { return x !== '-R' && x !== '--recursive'; }), own = ca[0], cf = ca.slice(1), crec = a.indexOf('-R') >= 0;
      if (!own || !cf.length) return err("chown: missing operand\nTry 'chown --help' for more information.\n");
      var o2 = own.indexOf(':') >= 0 ? own : own + ':' + (this.fileMeta(cf[0]).owner.split(':')[1] || 'root');
      for (var k = 0; k < cf.length; k++) {
        if (!exists(this, cf[k])) return err("chown: cannot access '" + cf[k] + "': No such file or directory\n");
        var tg = [this.abs(cf[k])]; if (crec) Object.keys(this.fs).forEach(function (kk) { if (kk.indexOf(self.abs(cf[k]) + '/') === 0) tg.push(kk); });
        tg.forEach(function (t) { setMeta(self, t, 'owner', o2.replace(/^:/, 'root:')); });
      }
      return out('');
    }
    if (c === 'stat') {
      var fi = a.indexOf('-c') >= 0 ? a[a.indexOf('-c') + 1] : null, sf = a.filter(function (x, ix) { return x[0] !== '-' && a[ix - 1] !== '-c'; }), so = '';
      for (var s2 = 0; s2 < sf.length; s2++) {
        if (!exists(this, sf[s2])) return err("stat: cannot statx '" + sf[s2] + "': No such file or directory\n");
        var m2 = this.fileMeta(sf[s2]), ow = m2.owner.split(':');
        so += (fi ? fi.replace(/%a/g, m2.mode).replace(/%U/g, ow[0]).replace(/%G/g, ow[1]).replace(/%n/g, sf[s2]).replace(/%A/g, (this.isDir(sf[s2]) && !(this.abs(sf[s2]) in this.fs) ? 'd' : '-') + modeFlags(m2.mode)) : '  File: ' + sf[s2] + '\nAccess: (0' + m2.mode + '/' + (this.isDir(sf[s2]) && !(this.abs(sf[s2]) in this.fs) ? 'd' : '-') + modeFlags(m2.mode) + ')  Uid: ( 0/ ' + ow[0] + ')   Gid: ( 0/ ' + ow[1] + ')') + '\n';
      }
      return out(so);
    }
    if (c === 'ls' && a.some(function (x) { return /^-[a-zA-Z]*l/.test(x); })) {
      var lp = a.filter(function (x) { return x[0] !== '-'; }), dflag = a.some(function (x) { return /^-[a-zA-Z]*d/.test(x); }), lo = '';
      if (!lp.length) lp = ['.'];
      var line = function (p, name) { var m3 = self.fileMeta(p), ow2 = m3.owner.split(':'), isD = self.isDir(p) && !(self.abs(p) in self.fs); return (isD ? 'd' : '-') + modeFlags(m3.mode) + '  1 ' + (ow2[0] + '        ').slice(0, 8) + ' ' + (ow2[1] + '        ').slice(0, 8) + ' ' + ('       ' + (isD ? 4096 : (self.fs[self.abs(p)] || '').length)).slice(-6) + ' Nov 23 10:00 ' + name; };
      for (var l2 = 0; l2 < lp.length; l2++) {
        var ab = this.abs(lp[l2]); if (!exists(this, lp[l2])) return err("ls: cannot access '" + lp[l2] + "': No such file or directory\n", 2);
        if ((ab in this.fs) || dflag) lo += line(lp[l2], lp[l2]) + '\n';
        else { var pre = ab === '/' ? '/' : ab + '/', names = {}; Object.keys(this.fs).forEach(function (k2) { if (k2.indexOf(pre) === 0) { var r = k2.slice(pre.length).split('/')[0]; if (r !== '.keep') names[r] = 1; } }); lo += 'total ' + Object.keys(names).length * 4 + '\n' + Object.keys(names).sort().map(function (nm2) { return line(pre + nm2, nm2); }).join('\n') + '\n'; }
      }
      return out(lo);
    }
    if (c === 'apparmor_parser') {
      var af = a.filter(function (x) { return x[0] !== '-'; })[0], txt = af ? this.readFile(af) : null;
      if (!af) return err('apparmor_parser: missing profile argument\n');
      if (txt === null) return err("apparmor_parser: Unable to open " + af + "\n");
      var pm = txt.match(/^\s*profile\s+([\w.\-]+)(\s+flags=\([^)]*\))?\s*\{/m);
      if (!pm || txt.indexOf('}') < 0) return err('AppArmor parser error for ' + af + ': Syntax error: profile definition is missing a name or braces\n');
      if (a.indexOf('-R') >= 0 || a.indexOf('--remove') >= 0) { if (f.aaLoaded) delete f.aaLoaded[pm[1]]; return out(''); }
      f.aaLoaded = f.aaLoaded || {}; f.aaLoaded[pm[1]] = /flags=\([^)]*complain/.test(txt) ? 'complain' : 'enforce'; this.changed(); return out('');
    }
    if (c === 'aa-status') {
      var L2 = Object.keys(f.aaLoaded || {}).concat(['docker-default', '/usr/sbin/ntpd']).sort();
      return out('apparmor module is loaded.\n' + L2.length + ' profiles are loaded.\n' + Object.keys(f.aaLoaded || {}).length + ' profiles are in enforce mode.\n' + Object.keys(f.aaLoaded || {}).concat(['docker-default']).map(function (x) { return '   ' + x; }).join('\n') + '\n');
    }
    return run2.apply(this, arguments);
  };

  // pods that need a node-local profile cannot start without it
  var cp0 = P.cfgProblem;
  P.cfgProblem = function (pod, c) {
    var sc = Object.assign({}, (pod.spec && pod.spec.securityContext) || {}, c.securityContext || {}), psc = (pod.spec && pod.spec.securityContext) || {}, csc = c.securityContext || {};
    var sp = csc.seccompProfile || psc.seccompProfile;
    if (sp && sp.type === 'Localhost') { var path = '/var/lib/kubelet/seccomp/' + String(sp.localhostProfile || '').replace(/^\//, ''); if (!sp.localhostProfile || !(path in this.fs)) return 'failed to create containerd container: cannot load seccomp profile "' + path + '": open ' + path + ': no such file or directory'; }
    var ap = csc.appArmorProfile || psc.appArmorProfile; void sc;
    if (ap && ap.type === 'Localhost') { var ld = F(this).aaLoaded || {}; if (!ap.localhostProfile || !ld[ap.localhostProfile]) return 'cannot enforce AppArmor: profile "' + ap.localhostProfile + '" is not loaded'; }
    return cp0.apply(this, arguments);
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* A DaemonSet whose pod template changes replaces its pods (a rolling update, done at once here); `rollout restart` relies on it. */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, rd0 = P.recDaemonSet;
  P.recDaemonSet = function (s) {
    var h = JSON.stringify(s.spec.template), seen = this._dsHash = this._dsHash || {}, self = this;
    if (seen[s.metadata.uid] !== undefined && seen[s.metadata.uid] !== h) this.podsOf(s).forEach(function (p) { self.remove(p, true); });
    seen[s.metadata.uid] = h;
    return rd0.apply(this, arguments);
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Admission checks (requests above limits, unsupported downward-API fields), imagePullPolicy Never, a read-only root filesystem,
   and suspended Jobs. Used by S198-S205. */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, U = Sim.util;
  var FIELDS = ['metadata.name', 'metadata.namespace', 'metadata.uid', 'spec.nodeName', 'spec.serviceAccountName', 'status.hostIP', 'status.hostIPs', 'status.podIP', 'status.podIPs'];
  function podSpecOf(o) {
    if (o.kind === 'Pod') return { spec: o.spec, path: 'spec' };
    if (/^(Deployment|ReplicaSet|StatefulSet|DaemonSet|Job)$/.test(o.kind) && o.spec && o.spec.template) return { spec: o.spec.template.spec, path: 'spec.template.spec' };
    if (o.kind === 'CronJob' && o.spec && o.spec.jobTemplate && o.spec.jobTemplate.spec.template) return { spec: o.spec.jobTemplate.spec.template.spec, path: 'spec.jobTemplate.spec.template.spec' };
    return null;
  }
  var df0 = P.defaults;
  P.defaults = function (o) {
    var r = df0.apply(this, arguments), ps = podSpecOf(o);
    if (ps && ps.spec) {
      var head = 'The ' + this.kindOf(o).singular.replace(/^./, function (x) { return x.toUpperCase(); }).replace('Cronjob', 'CronJob').replace('Daemonset', 'DaemonSet').replace('Statefulset', 'StatefulSet').replace('Replicaset', 'ReplicaSet') + ' "' + o.metadata.name + '" is invalid: ';
      (ps.spec.containers || []).concat(ps.spec.initContainers || []).forEach(function (c, i) {
        var kind = (ps.spec.containers || []).indexOf(c) >= 0 ? 'containers' : 'initContainers', ix = (ps.spec[kind] || []).indexOf(c), rq = (c.resources || {}).requests || {}, lm = (c.resources || {}).limits || {};
        ['cpu', 'memory'].forEach(function (k) {
          if (rq[k] === undefined || lm[k] === undefined) return;
          var f = k === 'cpu' ? U.parseCpu : U.parseMem;
          if (f(rq[k]) > f(lm[k])) throw new Sim.KErr(head + ps.path + '.' + kind + '[' + ix + '].resources.requests: Invalid value: "' + rq[k] + '": must be less than or equal to ' + k + ' limit of ' + lm[k]);
        });
        (c.env || []).forEach(function (e, j) {
          var fp = e.valueFrom && e.valueFrom.fieldRef && e.valueFrom.fieldRef.fieldPath;
          if (fp && FIELDS.indexOf(fp) < 0 && !/^metadata\.(labels|annotations)(\[.*\])?$/.test(fp)) throw new Sim.KErr(head + ps.path + '.' + kind + '[' + ix + '].env[' + j + '].valueFrom.fieldRef.fieldPath: Unsupported value: "' + fp + '": supported values: ' + FIELDS.map(function (x) { return '"' + x + '"'; }).join(', '));
        });
      });
    }
    return r;
  };
  // imagePullPolicy: Never needs the image already on the node (flags.nodeImages lists them)
  var cp1 = P.cfgProblem;
  P.cfgProblem = function (pod, c) {
    var dg = /@sha256:([^@]*)$/.exec(c.image || '');
    if (dg && !/^[0-9a-f]{64}$/.test(dg[1])) {
      pod._inv = pod._inv || {};
      if (!pod._inv[c.name]) { pod._inv[c.name] = 1; this.ev(pod, 'Warning', 'InspectFailed', 'Failed to apply default image tag "' + c.image + '": couldn\'t parse image name "' + c.image + '": invalid reference format'); this.ev(pod, 'Warning', 'Failed', 'Error: InvalidImageName'); }
      return 'InvalidImageName';
    }
    if (c.imagePullPolicy === 'Never' && ((this.flags && this.flags.nodeImages) || []).indexOf(c.image) < 0) {
      pod._nvr = pod._nvr || {};
      if (!pod._nvr[c.name]) { pod._nvr[c.name] = 1; this.ev(pod, 'Warning', 'ErrImageNeverPull', 'Container image "' + c.image + '" is not present with pull policy of Never'); }
      return 'ErrImageNeverPull';
    }
    return cp1.apply(this, arguments);
  };
  // a read-only root filesystem breaks nginx unless its cache and pid directories are writable volumes (only where flags.rofsStrict is set: S205)
  var pl1 = P.containerPlan;
  P.containerPlan = function (pod, c) {
    var plan = pl1.apply(this, arguments);
    if (this.flags && this.flags.rofsStrict && c.securityContext && c.securityContext.readOnlyRootFilesystem && /^(docker\.io\/library\/)?nginx(:|$)/.test(c.image || '') && !plan.exit) {
      var vols = (pod.spec.volumes || []).map(function (v) { return v.name; }), mounts = (c.volumeMounts || []).filter(function (m) { return vols.indexOf(m.name) >= 0 && !m.readOnly; }).map(function (m) { return m.mountPath.replace(/\/$/, ''); });
      function writable(dir) { return mounts.some(function (m) { return dir === m || dir.indexOf(m + '/') === 0; }); }
      var bad = !writable('/var/cache/nginx') ? '/var/cache/nginx/client_temp' : !writable('/var/run') && !writable('/run') ? '/var/run/nginx.pid' : null;
      if (bad) { plan.exit = { code: 1, reason: 'Error' }; plan.logs = ['/docker-entrypoint.sh: Configuration complete; ready for start up', 'nginx: [emerg] ' + (/pid/.test(bad) ? 'open() "' + bad + '"' : 'mkdir() "' + bad + '"') + ' failed (30: Read-only file system)']; }
    }
    return plan;
  };
  var rj1 = P.recJob;
  P.recJob = function (j) {
    if (j.spec.suspend && !(j.status && j.status.complete)) { j.status = j.status || {}; j.status.active = 0; j.status.conditions = [{ type: 'Suspended', status: 'True', reason: 'JobSuspended', message: 'Job suspended' }]; return; }
    if (j.status && j.status.conditions && j.status.conditions[0] && j.status.conditions[0].type === 'Suspended') j.status.conditions = [];
    return rj1.apply(this, arguments);
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Workload selectors are immutable: applying a changed selector over an existing workload is refused. */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, ap = P.applyObj;
  P.applyObj = function (obj) {
    try {
      if (obj && /^(Deployment|StatefulSet|DaemonSet|ReplicaSet)$/.test(obj.kind) && obj.metadata && obj.spec && obj.spec.selector) {
        var d = this.kindOf(obj), ns = obj.metadata.namespace || (d && d.ns ? this.ctxNs : ''), old = d && this.get(obj.kind, ns, obj.metadata.name);
        if (old && JSON.stringify(old.spec.selector) !== JSON.stringify(obj.spec.selector)) {
          var ml = obj.spec.selector.matchLabels || {}, txt = Object.keys(ml).sort().map(function (k) { return '"' + k + '":"' + ml[k] + '"'; }).join(', ');
          throw new Sim.KErr('The ' + d.singular.replace(/^./, function (x) { return x.toUpperCase(); }).replace('Daemonset', 'DaemonSet').replace('Statefulset', 'StatefulSet').replace('Replicaset', 'ReplicaSet') + ' "' + obj.metadata.name + '" is invalid: spec.selector: Invalid value: v1.LabelSelector{MatchLabels:map[string]string{' + txt + '}, MatchExpressions:[]v1.LabelSelectorRequirement(nil)}: field is immutable');
        }
      }
    } catch (e) { if (e instanceof Sim.KErr) throw e; }
    return ap.apply(this, arguments);
  };
})(typeof window !== 'undefined' ? window : globalThis);
// API validation: StatefulSet podManagementPolicy is immutable; Service traffic policy / affinity fields need the right type
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, ap2 = P.applyObj;
  P.applyObj = function (obj) {
    try {
      if (obj && obj.metadata && obj.spec) {
        var d = this.kindOf(obj), ns = obj.metadata.namespace || (d && d.ns ? this.ctxNs : ''), old = d && this.get(obj.kind, ns, obj.metadata.name);
        if (obj.kind === 'StatefulSet' && old && (old.spec.podManagementPolicy || 'OrderedReady') !== (obj.spec.podManagementPolicy || 'OrderedReady'))
          throw new Sim.KErr('The StatefulSet "' + obj.metadata.name + '" is invalid: spec: Forbidden: updates to statefulset spec for fields other than \'replicas\', \'ordinals\', \'template\', \'updateStrategy\', \'persistentVolumeClaimRetentionPolicy\' and \'minReadySeconds\' are forbidden');
        if (obj.kind === 'Service') {
          var sp = obj.spec, ty = sp.type || 'ClusterIP', nm = 'The Service "' + obj.metadata.name + '" is invalid: ';
          if (sp.externalTrafficPolicy && ty !== 'NodePort' && ty !== 'LoadBalancer') throw new Sim.KErr(nm + 'spec.externalTrafficPolicy: Invalid value: "' + sp.externalTrafficPolicy + '": may only be set for externally-accessible services');
          if (sp.sessionAffinityConfig && sp.sessionAffinity !== 'ClientIP') throw new Sim.KErr(nm + 'spec.sessionAffinityConfig: Invalid value: ' + JSON.stringify(sp.sessionAffinityConfig) + ': must not be set when session affinity is None');
        }
      }
    } catch (e) { if (e instanceof Sim.KErr) throw e; }
    return ap2.apply(this, arguments);
  };
})(typeof window !== 'undefined' ? window : globalThis);
// kubectl delete --cascade=orphan: children lose their owner reference instead of being deleted
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, kd = P.kDelete;
  P.kDelete = function (a) {
    var orph = a && a.flags && (a.flags.cascade === 'orphan' || a.flags.cascade === 'false' || a.flags.orphan === true);
    this._orphan = !!orph;
    try { return kd.apply(this, arguments); } finally { this._orphan = false; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
// RBAC escalation prevention (create/update of Roles and bindings by a non-admin identity), StatefulSet rollout status, hidden revision fields
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, KErr = Sim.KErr;
  var G = 'rbac.authorization.k8s.io';
  function held(sim, who, rule, ns) {
    var gs = rule.apiGroups || [''], rs = rule.resources || [], vs = rule.verbs || [];
    return rs.every(function (r) { return vs.every(function (v) { return sim.canI(who, v, r, ns); }); });
  }
  function fmt(r) { var q = function (a) { return '[' + (a || []).map(function (x) { return '"' + x + '"'; }).join(' ') + ']'; }; return '{APIGroups:' + q(r.apiGroups || ['']) + ', Resources:' + q(r.resources) + ', Verbs:' + q(r.verbs) + '}'; }
  P.escalationCheck = function (o) {
    var who = this._who; if (!who || !o || !o.kind) return;
    var ns = o.metadata && o.metadata.namespace || this.ctxNs, kind = o.kind, plural, role, name = o.metadata && o.metadata.name, self = this;
    if (kind === 'Role' || kind === 'ClusterRole') {
      plural = kind === 'Role' ? 'roles' : 'clusterroles';
      if (this.canI(who, 'escalate', plural, kind === 'Role' ? ns : '', name)) return;
      role = o;
    } else if (kind === 'RoleBinding' || kind === 'ClusterRoleBinding') {
      var rr = o.roleRef || {}; role = rr.kind === 'ClusterRole' ? this.get('ClusterRole', '', rr.name) : this.get('Role', ns, rr.name);
      plural = kind === 'RoleBinding' ? 'rolebindings' : 'clusterrolebindings';
      if (!role) return;
      this._bindNs = true; var okb; try { okb = this.canI(who, 'bind', rr.kind === 'ClusterRole' ? 'clusterroles' : 'roles', kind === 'RoleBinding' ? ns : '', rr.name); } finally { this._bindNs = false; }
      if (okb) return;
    } else return;
    var scope = (kind === 'Role' || kind === 'RoleBinding') ? ns : '';
    if (kind === 'RoleBinding' && role.kind === 'ClusterRole') scope = ns;
    var miss = (role.rules || []).filter(function (r) { return !held(self, who, r, scope); });
    if (!miss.length) return;
    (this.flags = this.flags || {}).escTried = true;
    var grp = (this.flags && this.flags.userGroups && this.flags.userGroups[who] || []).concat(['system:authenticated']);
    throw new KErr('Error from server (Forbidden): ' + plural + '.' + G + ' "' + name + '" is forbidden: user "' + who + '" (groups=[' + grp.map(function (x) { return '"' + x + '"'; }).join(' ') + ']) is attempting to grant RBAC permissions not currently held:\n' + miss.map(fmt).join('\n'));
  };
  var cr0 = P.createRaw, ap3 = P.applyObj, ex0 = P.exportObj;
  P.createRaw = function (o) { if (this._who) this.escalationCheck(o); return cr0.apply(this, arguments); };
  P.applyObj = function (o) { if (this._who) this.escalationCheck(o); return ap3.apply(this, arguments); };
  P.exportObj = function (o) { var c = ex0.apply(this, arguments); delete c._revs; delete c._cur; return c; };
  var kr0 = P.kRollout;
  P.kRollout = function (a) {
    var sub = a.pos[0], f = a.flags, ns = f.n || this.ctxNs, probe = { pos: a.pos.slice(1), flags: f }, refs;
    try { refs = this.parseRefs(probe); } catch (e) { refs = []; }
    var r = refs[0], o = r && r.name && r.d.kind === 'StatefulSet' ? this.get('StatefulSet', ns, r.name) : null;
    if (!o || sub !== 'status') return kr0.apply(this, arguments);
    var lines = '', part = ((o.spec.updateStrategy || {}).rollingUpdate || {}).partition || 0, self = this, want = o.spec.replicas;
    for (var i = 0; i < 40; i++) {
      var st = o.status || {};
      if ((o.spec.updateStrategy || {}).type === 'OnDelete') throw new KErr('error: rollout status is only available for RollingUpdate strategy type');
      var need = want - part, ready = st.readyReplicas === want;
      if (st.updateRevision && st.updatedReplicas >= need && ready) {
        return lines + (part ? 'partitioned roll out complete: ' + st.updatedReplicas + ' new pods have been updated...\n' : 'statefulset rolling update complete ' + want + ' pods at revision ' + st.updateRevision + '...\n');
      }
      if (i === 0 || i % 5 === 0) lines += st.readyReplicas < want ? 'Waiting for ' + (want - st.readyReplicas) + ' pods to be ready...\n' : 'Waiting for partitioned roll out to finish: ' + (st.updatedReplicas || 0) + ' out of ' + need + ' new pods have been updated...\n';
      this.settle(1);
    }
    throw new KErr(lines + 'error: timed out waiting for the condition');
  };
})(typeof window !== 'undefined' ? window : globalThis);
// expired admin client certificate (flags.certAdminExpired): per-certificate renewal, and the workstation kubeconfig must be refreshed
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype;
  function out(s, c) { return { stdout: s, stderr: '', code: c || 0 }; }
  var ssh0 = P.ssh, run0 = P.runCmd;
  P.ssh = function (a) {
    var f = this.flags || {};
    if (f.certAdminExpired === undefined) return ssh0.apply(this, arguments);
    var node = String(a[0] || '').replace(/^.*@/, ''), cmd = a.slice(1).join(' ').replace(/^(['"])(.*)\1$/, '$2').trim().replace(/^sudo\s+/, ''), m;
    if (/^kubeadm\s+certs\s+/.test(cmd) && this.get('Node', '', node) && !/^cp/.test(node)) return { stdout: '', stderr: 'bash: kubeadm: command not found\n', code: 127 };
    if (/^kubeadm\s+certs\s+check-expiration$/.test(cmd)) {
      f.certChecked = true;
      var bad = !f.adminRenewed, row = function (n, ex, ca) { return n.padEnd(26) + (ex ? 'Nov 04, 2026 08:12 UTC   <invalid>      ' : 'Nov 11, 2027 09:31 UTC   364d            ').padEnd(37) + (ca || 'ca').padEnd(24) + 'no\n'; };
      return out('[check-expiration] Reading configuration from the "kubeadm-config" ConfigMap in namespace "kube-system"...\n\nCERTIFICATE                EXPIRES                  RESIDUAL TIME   CERTIFICATE AUTHORITY   EXTERNALLY MANAGED\n' +
        row('admin.conf', bad) + row('apiserver') + row('apiserver-etcd-client', false, 'etcd-ca') + row('apiserver-kubelet-client') + row('controller-manager.conf') + row('etcd-healthcheck-client', false, 'etcd-ca') + row('etcd-peer', false, 'etcd-ca') + row('etcd-server', false, 'etcd-ca') + row('front-proxy-client', false, 'front-proxy-ca') + row('scheduler.conf') +
        '\nCERTIFICATE AUTHORITY   EXPIRES                  RESIDUAL TIME   EXTERNALLY MANAGED\nca                      Nov 09, 2035 07:30 UTC   9y              no\netcd-ca                 Nov 09, 2035 07:30 UTC   9y              no\nfront-proxy-ca          Nov 09, 2035 07:30 UTC   9y              no\n');
    }
    if ((m = cmd.match(/^kubeadm\s+certs\s+renew\s+(\S+)$/))) {
      if (m[1] === 'admin.conf') { f.adminRenewed = true; return out('[renew] Reading configuration from the cluster...\n[renew] FYI: You can look at this config file with \'kubectl -n kube-system get cm kubeadm-config -o yaml\'\n\ncertificate embedded in the kubeconfig file for the admin to use and for kubeadm itself renewed\n\nDone renewing certificates. You must restart the kube-apiserver, kube-controller-manager, kube-scheduler and etcd, so that they can use the new certificates.\n'); }
      if (m[1] === 'ca') return { stdout: '', stderr: 'error: unknown certificate "ca": kubeadm does not renew certificate authorities\n', code: 1 };
      return out('certificate renewed (no change was needed for this lab)\n');
    }
    return ssh0.apply(this, arguments);
  };
  P.runCmd = function (w) {
    var f = this.flags || {}, c = w && w[0];
    if (f.certAdminExpired) {
      if (c === 'kubectl' || c === 'k') return { stdout: '', stderr: 'error: You must be logged in to the server (Unauthorized)\n', code: 1 };
      if (c === 'scp') {
        var src = w.slice(1).filter(function (x) { return !/^-/.test(x); });
        if (src.length === 2 && /^(\w+@)?cp1:\/etc\/kubernetes\/admin\.conf$/.test(src[0]) && /kube\/config$/.test(src[1])) {
          if (f.adminRenewed) f.certAdminExpired = false;
          return out('admin.conf                                   100% 5650     4.2MB/s   00:00\n');
        }
        return { stdout: '', stderr: 'scp: only cp1:/etc/kubernetes/admin.conf can be copied in this simulator\n', code: 1 };
      }
    }
    return run0.apply(this, arguments);
  };
})(typeof window !== 'undefined' ? window : globalThis);
