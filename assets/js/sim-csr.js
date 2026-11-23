/* Simulator: certificate-based users. SCRIPTED model, not real PKI.
   - `openssl genrsa | req -new | x509 -noout -subject|-text` work on fake PEM files that carry their subject, so a CSR remembers CN/O.
   - CertificateSigningRequest objects are validated (signerName, usages, request) like the API server; `kubectl certificate approve|deny`
     issues a certificate for the kube-apiserver-client signer; the issued cert carries CN (user) and O (groups).
   - `kubectl config set-credentials` + contexts: a non-admin context acts as the certificate's CN with its O groups, and RBAC is enforced.
   No real keys, signatures, expiry or CA exist behind this. */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, KErr = Sim.KErr;
  function F(s) { return s.flags || (s.flags = {}); }
  function out(s, c) { return { stdout: s, stderr: '', code: c || 0 }; } function err(s, c) { return { stdout: '', stderr: s, code: c || 1 }; }
  function b64(t) { return typeof Buffer !== 'undefined' ? Buffer.from(t).toString('base64') : btoa(unescape(encodeURIComponent(t))); }
  function unb64(t) { try { return typeof Buffer !== 'undefined' ? Buffer.from(String(t).replace(/\s+/g, ''), 'base64').toString() : decodeURIComponent(escape(atob(String(t).replace(/\s+/g, '')))); } catch (e) { return ''; } }
  function pem(type, body) { return '-----BEGIN ' + type + '-----\n' + (body.match(/.{1,64}/g) || []).join('\n') + '\n-----END ' + type + '-----\n'; }
  function unpem(t, type) { var m = String(t).match(new RegExp('-----BEGIN ' + type + '-----\\s+([\\s\\S]*?)\\s+-----END ' + type + '-----')); return m ? unb64(m[1]) : null; }
  function subj(s) { var o = { cn: '', o: [] }; String(s || '').split('/').forEach(function (kv) { var m = kv.match(/^(CN|O)=(.*)$/); if (!m) return; if (m[1] === 'CN') o.cn = m[2]; else o.o.push(m[2]); }); return o; }
  function subjText(o) { return ['CN = ' + o.cn].concat(o.o.map(function (x) { return 'O = ' + x; })).join(', '); }
  function arg(w, name) { for (var i = 0; i < w.length; i++) { if (w[i] === name) return w[i + 1]; if (w[i].indexOf(name + '=') === 0) return w[i].slice(name.length + 1); } return null; }
  var ADMIN = 'kubernetes-admin';

  // ── openssl ──
  P.opensslCsr = function (w, stdin) {
    var self = this, sub = w[0];
    if (sub === 'genrsa') { var o = arg(w, '-out'), bits = (w.filter(function (x) { return /^\d+$/.test(x); })[0]) || '2048'; var seed = (this.seed = ((this.seed || 7) * 1103515245 + 12345) & 0x7fffffff), body = b64('KDKEY|' + bits + '|' + seed + '|' + b64(String(seed * 31))).slice(0, 120);
      var txt = pem('RSA PRIVATE KEY', body); if (o) { this.writeFile(o, txt); return out(''); } return out(txt); }
    if (sub === 'req') {
      var inf = arg(w, '-in') || (stdin ? '/dev/stdin' : null), key = arg(w, '-key'), of = arg(w, '-out'), sj = arg(w, '-subj');
      if (w.indexOf('-new') >= 0) {
        if (!key) return err('req: no private key given (use -key)\n');
        var kt = this.readFile(key); if (kt === null) return err('Could not open file or uri for loading private key from ' + key + '\n');
        if (!/BEGIN (RSA )?PRIVATE KEY/.test(kt)) return err('Could not read private key from ' + key + '\n');
        if (!sj) return err('openssl req -new needs -subj "/CN=<user>/O=<group>" here (the simulator has no interactive prompts)\n');
        var sp = subj(sj); if (!sp.cn) return err('req: subject must contain CN=\n');
        var csr = pem('CERTIFICATE REQUEST', b64('KDCSR|' + sj + '|' + key)); if (of) { this.writeFile(of, csr); return out(''); } return out(csr);
      }
      if (inf) { var ct = inf === '/dev/stdin' ? stdin : this.readFile(inf); if (ct === null) return err('Could not open file or uri for loading X509 request from ' + inf + '\n'); var d = unpem(ct, 'CERTIFICATE REQUEST'); if (!d || d.indexOf('KDCSR|') !== 0) return err('Could not read X509 request from ' + inf + '\n'); if (w.indexOf('-subject') >= 0) return out('subject=' + subjText(subj(d.split('|')[1])) + '\n'); return out('Certificate Request:\n    Subject: ' + subjText(subj(d.split('|')[1])) + '\n'); }
      return err('openssl req: unsupported option combination in this simulator\n');
    }
    if (sub === 'x509') {
      var inx = arg(w, '-in') || (stdin ? '/dev/stdin' : null); if (!inx) return err('openssl x509: -in <file> is required here\n');
      var xt = inx === '/dev/stdin' ? stdin : this.readFile(inx); if (xt === null) return err('Could not open file or uri for loading certificate from ' + inx + '\n');
      var xd = unpem(xt, 'CERTIFICATE'); if (!xd || xd.indexOf('KDCRT|') !== 0) return err('Could not read certificate from ' + inx + '\nunable to load certificate\n');
      var pr = xd.split('|'), sx = subj(pr[1]);
      if (w.indexOf('-subject') >= 0) return out('subject=' + subjText(sx) + '\n');
      if (w.indexOf('-issuer') >= 0) return out('issuer=CN = kubernetes\n');
      if (w.indexOf('-text') >= 0) return out('Certificate:\n    Data:\n        Issuer: CN = kubernetes\n        Validity\n            Not Before: Jan  1 00:00:00 2026 GMT\n            Not After : ' + (pr[3] === 'exp=86400' ? 'Jan  2 00:00:00 2026 GMT' : 'Jan  1 00:00:00 2027 GMT') + '\n        Subject: ' + subjText(sx) + '\n        X509v3 Extended Key Usage: TLS Web Client Authentication\n');
      return out('');
    }
    return null;
  };
  var run0 = P.runCmd;
  P.runCmd = function (w, stdin) {
    if (w && w[0] === 'openssl' && ['genrsa', 'req', 'x509'].indexOf(w[1]) >= 0) { var r = this.opensslCsr(w.slice(1), stdin); if (r) return r; }
    if (w && (w[0] === 'kubectl' || w[0] === 'k')) {
      // identity for this call: --context overrides the current context
      var f = F(this), cur = null, ctxName = arg(w, '--context');
      if (f.contexts) cur = f.contexts.filter(function (c) { return c.name === (ctxName || f.current); })[0] || null;
      this._ctxUser = cur && cur.user && cur.user !== ADMIN ? cur.user : null;
      try { return run0.call(this, w, stdin); } finally { this._ctxUser = null; }
    }
    return run0.apply(this, arguments);
  };

  // ── identity + RBAC enforcement for non-admin contexts and --as ──
  var WRITE = { create: 'create', apply: 'create', run: 'create', delete: 'delete', patch: 'patch', edit: 'update', scale: 'patch', label: 'patch', annotate: 'patch', set: 'patch', expose: 'create', replace: 'update' };
  var inner0 = P.kubectlInner;
  P.kubectlInner = function (args, stdin) {
    var f = F(this), asIdx = -1, i; for (i = 0; i < args.length; i++) if (args[i] === '--as' || /^--as=/.test(args[i])) asIdx = i;
    var as = asIdx >= 0 ? (args[asIdx] === '--as' ? args[asIdx + 1] : args[asIdx].slice(5)) : null, groups = [];
    for (i = 0; i < args.length; i++) { if (args[i] === '--as-group' && args[i + 1]) groups.push(args[i + 1]); else if (/^--as-group=/.test(args[i])) groups.push(args[i].slice(11)); }
    var who = as, viaCert = false;
    if (!who && this._ctxUser) { // act as the certificate's subject
      var cr = (f.creds || {})[this._ctxUser]; // users never given credentials (decorative contexts in older labs) act as the admin
      if (cr && !cr.admin) {
        if (!cr.subject) return err('error: You must be logged in to the server (Unauthorized)\n');
        who = cr.subject.cn; groups = cr.subject.o.slice(); viaCert = true;
      }
    }
    if (who && who !== ADMIN) { f.userGroups = f.userGroups || {}; f.userGroups[who] = groups; }
    var verbIdx = 0; while (verbIdx < args.length && /^-/.test(args[verbIdx])) verbIdx += (/^--?(n|namespace|o|output|l|selector|f|filename|c|container|as|as-group|context)$/.test(args[verbIdx]) ? 2 : 1);
    var verb = args[verbIdx];
    if (viaCert && !as) { // auth can-i answers for the acting identity
      if (verb === 'auth' && args[verbIdx + 1] === 'can-i') args = args.concat(['--as', who]);
    }
    if (who && who !== ADMIN && ['get', 'describe', 'delete', 'create', 'apply', 'run', 'patch', 'edit', 'scale', 'label', 'annotate', 'expose', 'replace', 'logs', 'exec'].indexOf(verb) >= 0) {
      var rest = args.filter(function (x, k) { return k > verbIdx && !/^-/.test(x) && !(k > 0 && /^--?(n|namespace|o|output|l|selector|f|filename|c|container|as|as-group|context)$/.test(args[k - 1])); });
      var tok = rest[0], d = tok && this.findKind(String(tok).split('/')[0].split(',')[0]);
      var nsFlag = null; for (i = 0; i < args.length; i++) { if ((args[i] === '-n' || args[i] === '--namespace') && args[i + 1]) nsFlag = args[i + 1]; else if (/^--namespace=/.test(args[i])) nsFlag = args[i].slice(12); }
      var allNs = args.indexOf('-A') >= 0 || args.indexOf('--all-namespaces') >= 0;
      if (d) {
        var named = String(tok).indexOf('/') > 0 || rest.length > 1, v = verb === 'get' || verb === 'describe' ? (named ? 'get' : 'list') : WRITE[verb] || 'get', nsq = d.ns ? (allNs ? null : (nsFlag || this.ctxNs)) : '';
        if (verb === 'get' && args.some(function (x) { return x === '-w' || x === '--watch'; })) v = 'watch';
        if (!this.canI(who, v, d.plural, nsq, named ? (String(tok).indexOf('/') > 0 ? tok.split('/')[1] : rest[1]) : undefined))
          return err('Error from server (Forbidden): ' + d.plural + (d.group ? '.' + d.group : '') + (named ? ' "' + (String(tok).indexOf('/') > 0 ? tok.split('/')[1] : rest[1]) + '"' : '') + ' is forbidden: User "' + who + '" cannot ' + v + ' resource "' + d.plural + '" in API group "' + d.group + '" ' + (d.ns ? (allNs ? 'at the cluster scope' : 'in the namespace "' + (nsFlag || this.ctxNs) + '"') : 'at the cluster scope') + '\n');
      }
      if (verb === 'logs' || verb === 'exec') { var sres = verb === 'logs' ? 'pods/log' : 'pods/exec'; if (!this.canI(who, verb === 'logs' ? 'get' : 'create', sres, nsFlag || this.ctxNs)) return err('Error from server (Forbidden): pods "' + (rest[0] || '') + '" is forbidden: User "' + who + '" cannot ' + (verb === 'logs' ? 'get' : 'create') + ' resource "' + sres + '" in API group "" in the namespace "' + (nsFlag || this.ctxNs) + '"\n'); }
    }
    return inner0.call(this, args, stdin);
  };

  // ── kubectl certificate approve|deny ──
  var kbi0 = P.kubectlInner;
  P.kubectlInner = function (args, stdin) {
    var vi = 0; while (vi < args.length && /^-/.test(args[vi])) vi++;
    if (args[vi] === 'certificate') {
      var act = args[vi + 1], names = args.slice(vi + 2).filter(function (x) { return !/^-/.test(x); }), self = this;
      if (['approve', 'deny'].indexOf(act) < 0) return err('error: unknown certificate command "' + (act || '') + '" (approve, deny)\n');
      if (!names.length) return err('error: one or more CSRs must be specified as <name>\n');
      var o = '';
      for (var i = 0; i < names.length; i++) {
        var c = this.get('CertificateSigningRequest', '', names[i]);
        if (!c) return err('Error from server (NotFound): certificatesigningrequests.certificates.k8s.io "' + names[i] + '" not found\n');
        var cs = (c.status = c.status || {}).conditions = c.status.conditions || [];
        if (cs.some(function (x) { return x.type === 'Approved' || x.type === 'Denied'; })) { o += 'certificatesigningrequest.certificates.k8s.io/' + names[i] + ' ' + (cs[0].type === 'Approved' ? 'approved' : 'denied') + ' (already ' + cs[0].type.toLowerCase() + ')\n'; continue; }
        cs.push({ type: act === 'approve' ? 'Approved' : 'Denied', status: 'True', reason: act === 'approve' ? 'KubectlApprove' : 'KubectlDeny', message: 'This CSR was ' + (act === 'approve' ? 'approved' : 'denied') + ' by kubectl certificate ' + act + '.', lastUpdateTime: new Date(0).toISOString() });
        if (act === 'approve' && c.spec.signerName === 'kubernetes.io/kube-apiserver-client') {
          var req = unpem(unb64(c.spec.request), 'CERTIFICATE REQUEST') || '', sj = (req.split('|')[1]) || '';
          c.status.certificate = b64(pem('CERTIFICATE', b64('KDCRT|' + sj + '|' + c.spec.signerName + '|exp=' + (c.spec.expirationSeconds || 31536000))));
        }
        this.changed();
        o += 'certificatesigningrequest.certificates.k8s.io/' + names[i] + ' ' + (act === 'approve' ? 'approved' : 'denied') + '\n';
      }
      return out(o);
    }
    return kbi0.call(this, args, stdin);
  };

  // ── PriorityClass: value and preemptionPolicy are immutable, as in the API server ──
  var ao0 = P.applyObj;
  P.applyObj = function (obj, mode, flags) {
    if (obj && obj.kind === 'PersistentVolumeClaim' && mode !== 'create' && obj.metadata) {
      var pex = this.get('PersistentVolumeClaim', obj.metadata.namespace || (flags && flags.n) || this.ctxNs, obj.metadata.name), ps0 = obj.spec || {};
      if (pex) {
        var pbad = false, pe = pex.spec || {};
        if (ps0.storageClassName !== undefined && ps0.storageClassName !== pe.storageClassName) pbad = true;
        if (ps0.accessModes && JSON.stringify(ps0.accessModes) !== JSON.stringify(pe.accessModes)) pbad = true;
        if (ps0.volumeName !== undefined && pe.volumeName && ps0.volumeName !== pe.volumeName) pbad = true;
        if (pbad) throw new KErr('The PersistentVolumeClaim "' + pex.metadata.name + '" is invalid: spec: Forbidden: spec is immutable after creation except resources.requests and volumeAttributesClass for bound claims\n  (delete the claim and create it again; for a pending claim there is no data to lose, for a bound one check the data first)');
      }
    }
    if (obj && obj.kind === 'PriorityClass' && mode !== 'create') {
      var ex = this.get('PriorityClass', '', obj.metadata && obj.metadata.name);
      if (ex) {
        var bad = function (fld, msg) { return new KErr('The PriorityClass "' + ex.metadata.name + '" is invalid: ' + fld + ': Forbidden: ' + msg); };
        if (obj.value !== undefined && obj.value !== ex.value) throw bad('value', 'may not be changed in an update.');
        if (obj.preemptionPolicy !== undefined && obj.preemptionPolicy !== (ex.preemptionPolicy || 'PreemptLowerPriority')) throw bad('preemptionPolicy', 'Field is immutable');
      }
    }
    return ao0.apply(this, arguments);
  };

  var kp0 = P.kPatch;
  P.kPatch = function (a) {
    var t = String(a.pos[0] || '').split('/')[0].toLowerCase(), nm = a.pos[1] || String(a.pos[0] || '').split('/')[1];
    if (/^(pc|priorityclass(es)?)$/.test(t) && nm) {
      var ex = this.get('PriorityClass', '', nm);
      if (ex) { var v0 = ex.value, p0 = ex.preemptionPolicy; var r = kp0.apply(this, arguments);
        if (ex.value !== v0) { ex.value = v0; ex.preemptionPolicy = p0; throw new KErr('The PriorityClass "' + nm + '" is invalid: value: Forbidden: may not be changed in an update.'); }
        if (ex.preemptionPolicy !== p0) { ex.preemptionPolicy = p0; throw new KErr('The PriorityClass "' + nm + '" is invalid: preemptionPolicy: Forbidden: Field is immutable'); }
        return r; }
    }
    if (/^(pvc|persistentvolumeclaims?)$/.test(t) && nm) {
      var pv = this.get('PersistentVolumeClaim', (a.flags && a.flags.n) || this.ctxNs, nm);
      if (pv) { var pb = JSON.stringify([pv.spec.storageClassName, pv.spec.accessModes, pv.spec.volumeName]), pre = JSON.stringify(pv.spec); var r2 = kp0.apply(this, arguments);
        if (pb !== JSON.stringify([pv.spec.storageClassName, pv.spec.accessModes, pv.spec.volumeName])) { pv.spec = JSON.parse(pre); throw new KErr('The PersistentVolumeClaim "' + nm + '" is invalid: spec: Forbidden: spec is immutable after creation except resources.requests and volumeAttributesClass for bound claims'); }
        return r2; }
    }
    return kp0.apply(this, arguments);
  };

  // ── CSR validation at creation ──
  var cr0 = P.createRaw;
  P.createRaw = function (obj) {
    if (obj && obj.kind === 'Pod' && obj.spec && obj.spec.serviceAccountName && obj.spec.serviceAccountName !== 'default' && obj.metadata && !/^kube-/.test(obj.metadata.namespace || '') && !obj._skipSA) {
      var sans = obj.metadata.namespace || this.ctxNs;
      if (this.get('Namespace', '', sans) && !this.get('ServiceAccount', sans, obj.spec.serviceAccountName)) throw new KErr('Error from server (Forbidden): pods "' + (obj.metadata.name || obj.metadata.generateName || '') + '" is forbidden: error looking up service account ' + sans + '/' + obj.spec.serviceAccountName + ': serviceaccount "' + obj.spec.serviceAccountName + '" not found');
    }
    if (obj && obj.kind === 'CertificateSigningRequest') {
      var sp = obj.spec || {}, nm = obj.metadata && obj.metadata.name, pre = 'The CertificateSigningRequest "' + nm + '" is invalid: ';
      if (!sp.request) throw new KErr(pre + 'spec.request: Required value');
      var raw = unb64(sp.request), req = unpem(raw, 'CERTIFICATE REQUEST');
      if (req === null || req.indexOf('KDCSR|') !== 0) throw new KErr(pre + 'spec.request: Invalid value: ' + JSON.stringify(String(sp.request).slice(0, 24) + '...') + ': PEM block type must be CERTIFICATE REQUEST (base64-encode the .csr file with `base64 | tr -d "\\n"`)');
      if (!sp.signerName) throw new KErr(pre + 'spec.signerName: Required value');
      if (sp.signerName === 'kubernetes.io/kube-apiserver-client') {
        var allowed = ['digital signature', 'key encipherment', 'client auth'], u = sp.usages || [];
        if (u.indexOf('client auth') < 0 || u.some(function (x) { return allowed.indexOf(x) < 0; })) throw new KErr(pre + 'spec.usages: Invalid value: ' + JSON.stringify(u) + ': allowed usages are ["client auth" "digital signature" "key encipherment"] and "client auth" is required');
      }
      if (sp.expirationSeconds !== undefined && sp.expirationSeconds < 600) throw new KErr(pre + 'spec.expirationSeconds: Invalid value: ' + sp.expirationSeconds + ': may not specify a duration less than 600 seconds (10 minutes)');
    }
    return cr0.apply(this, arguments);
  };

  // ── kubectl config set-credentials / get-users / delete-user ──
  var cfg0 = P.kConfig;
  P.kConfig = function (a) {
    var sub = a.pos[0], f = F(this), nm = a.pos[1], fl = a.flags || {};
    f.creds = f.creds || { 'kubernetes-admin': { admin: true } };
    if (sub === 'set-credentials') {
      if (!nm) throw new KErr('error: user name required');
      var cp = fl['client-certificate'], kp = fl['client-key'], cur = f.creds[nm] || {};
      if (cp !== undefined || kp !== undefined) {
        var ct = cp ? this.readFile(cp) : null, kt = kp ? this.readFile(kp) : null;
        if (cp && ct === null) throw new KErr('error: error reading ' + this.abs(cp) + ': no such file or directory'); if (kp && kt === null) throw new KErr('error: error reading ' + this.abs(kp) + ': no such file or directory');
        var d = ct ? unpem(ct, 'CERTIFICATE') : null; cur.subject = d && d.indexOf('KDCRT|') === 0 ? subj(d.split('|')[1]) : null; cur.hasKey = !!kt;
        cur.certFile = cp; cur.keyFile = kp;
      }
      if (fl.token) { cur.token = true; }
      f.creds[nm] = cur; return 'User "' + nm + '" set.\n';
    }
    if (sub === 'get-contexts' && fl.o === 'name') { var f0 = F(this); if (!f0.contexts) return cfg0.apply(this, arguments); return f0.contexts.map(function (c) { return c.name; }).join('\n') + '\n'; }
    if (sub === 'view' && typeof fl.o === 'string' && /^jsonpath=/.test(fl.o)) {
      var f1 = F(this), cx = f1.contexts || [{ name: 'kubernetes-admin@kubedrill', cluster: 'kubedrill', user: 'kubernetes-admin', ns: this.ctxNs }], self2 = this;
      var rootObj = { 'current-context': f1.current || cx[0].name, contexts: cx.map(function (c) { return { name: c.name, context: { cluster: c.cluster, user: c.user, namespace: c.name === (f1.current || cx[0].name) ? self2.ctxNs : c.ns } }; }), users: Object.keys(f1.creds || {}).map(function (u) { return { name: u }; }) };
      return this.jsonpath(rootObj, fl.o.replace(/^jsonpath=/, ''));
    }
    if (sub === 'get-users') return 'NAME\n' + Object.keys(f.creds).join('\n') + '\n';
    if (sub === 'delete-user') { if (!f.creds[nm]) throw new KErr('error: cannot delete user ' + nm + ', not in /home/student/.kube/config'); delete f.creds[nm]; return 'deleted user ' + nm + ' from /home/student/.kube/config\n'; }
    return cfg0.apply(this, arguments);
  };

  // ── CRD structural-schema validation (subset): required, type, enum, minimum/maximum, pattern, unknown fields ──
  // Custom resources are validated on create and apply like the API server does. Not modelled: CEL rules, defaulting, pruning, conversion, subresources.
  var regCrd0 = P.registerCrd;
  P.registerCrd = function (crd) {
    var r = regCrd0.apply(this, arguments), n = (crd.spec || {}).names || {}, v = ((crd.spec || {}).versions || [])[0] || {};
    var k = this.kinds.filter(function (d) { return d.custom && d.kind === n.kind; })[0];
    if (k) k.schema = (v.schema && v.schema.openAPIV3Schema) || null;
    return r;
  };
  function tname(v) { return Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v === 'number' ? (Math.floor(v) === v ? 'integer' : 'number') : typeof v; }
  function crdIssues(sch, v, path, out, kind, strict) {
    if (!sch || v === undefined) return;
    var t = sch.type, got = tname(v);
    if (t && !(t === got || (t === 'number' && got === 'integer') || (t === 'object' && got === 'object' && v !== null))) { out.push({ k: 'type', m: path + ': Invalid value: "' + got + '": ' + path + ' in body must be of type ' + t + ': "' + got + '"' }); return; }
    if (sch.enum && sch.enum.indexOf(v) < 0) out.push({ k: 'enum', m: path + ': Unsupported value: ' + JSON.stringify(v) + ': supported values: ' + sch.enum.map(function (e) { return JSON.stringify(e); }).join(', ') });
    if (typeof v === 'number') { if (sch.minimum !== undefined && v < sch.minimum) out.push({ k: 'min', m: path + ': Invalid value: ' + v + ': ' + path + ' in body should be greater than or equal to ' + sch.minimum }); if (sch.maximum !== undefined && v > sch.maximum) out.push({ k: 'max', m: path + ': Invalid value: ' + v + ': ' + path + ' in body should be less than or equal to ' + sch.maximum }); }
    if (typeof v === 'string' && sch.pattern) { try { if (!new RegExp(sch.pattern).test(v)) out.push({ k: 'pattern', m: path + ': Invalid value: "' + v + '": ' + path + ' in body should match \'' + sch.pattern + '\'' }); } catch (e) { /* bad pattern */ } }
    if (got === 'object' && sch.properties) {
      (sch.required || []).forEach(function (r) { if (v[r] === undefined) out.push({ k: 'required', m: path + '.' + r + ': Required value' }); });
      Object.keys(v).forEach(function (key) {
        if (sch.properties[key]) crdIssues(sch.properties[key], v[key], path + '.' + key, out, kind, strict);
        else if (!sch['x-kubernetes-preserve-unknown-fields'] && (path !== 'metadata')) out.push({ k: 'unknown', f: path + '.' + key, m: 'unknown field "' + path + '.' + key + '"' });
      });
    }
    if (got === 'array' && sch.items) v.forEach(function (x, i) { crdIssues(sch.items, x, path + '[' + i + ']', out, kind, strict); });
  }
  function crdCheck(s, obj) {
    var d = s.kindOf && s.kindOf(obj); if (!d || !d.custom || !d.schema) return;
    var sch = d.schema, out = [], top = obj.spec;
    var sp = sch.properties && sch.properties.spec; (sch.required || []).forEach(function (r) { if (obj[r] === undefined) out.push({ k: 'required', m: r + ': Required value' }); });
    if (sp) { if (top !== undefined) crdIssues(sp, top, 'spec', out, d.kind, true); }
    if (!out.length) return;
    var unk = out.filter(function (o) { return o.k === 'unknown'; }), real = out.filter(function (o) { return o.k !== 'unknown'; });
    if (unk.length && !real.length) throw new KErr('error: error validating data: ValidationError(' + d.kind + '.' + unk[0].f.replace(/\.[^.]+$/, '') + '): unknown field "' + unk[0].f.split('.').pop() + '" in ' + d.group.split('.').reverse().join('.') + '.' + d.api.split('/')[1] + '.' + d.kind + (unk[0].f.indexOf('.') > 0 ? '.' + unk[0].f.replace(/\.[^.]+$/, '') : '') + '; if you choose to ignore these errors, turn validation off with --validate=false');
    throw new KErr('The ' + d.kind + ' "' + ((obj.metadata || {}).name || '') + '" is invalid: ' + real.map(function (o) { return o.m; }).join(', '));
  }
  var crCrd0 = P.createRaw;
  P.createRaw = function (obj) { crdCheck(this, obj); return crCrd0.apply(this, arguments); };
  var apCrd0 = P.applyObj;
  P.applyObj = function (obj) { crdCheck(this, obj); return apCrd0.apply(this, arguments); };

  // ═══ Later additions (v1.34-era features). Same honesty rule: modelled behaviour, not a real API server. ═══
  var clone0 = Sim.util.clone, matchSel0 = Sim.util.matchSel;

  // ── tiny CEL subset (ValidatingAdmissionPolicy): paths, literals, == != < <= > >= && || ! ?: + - * / %, in, has(), size(),
  //    startsWith/endsWith/contains/matches/lowerAscii/upperAscii, all/exists/exists_one/filter/map macros, int()/string()/double() ──
  function celTok(src) {
    var t = [], i = 0, m, re = /\s*(?:(\d+\.\d+|\d+)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([A-Za-z_][A-Za-z0-9_]*)|(&&|\|\||==|!=|<=|>=|[-+*\/%<>!?:.,()\[\]{}]))/y;
    while (i < src.length) { re.lastIndex = i; m = re.exec(src); if (!m) { if (/^\s*$/.test(src.slice(i))) break; throw new Error('CEL syntax error near "' + src.slice(i, i + 12) + '"'); } i = re.lastIndex; if (m[1] !== undefined) t.push({ k: 'n', v: parseFloat(m[1]) }); else if (m[2] !== undefined) t.push({ k: 's', v: m[2].slice(1, -1).replace(/\\(.)/g, '$1') }); else if (m[3] !== undefined) t.push({ k: 'i', v: m[3] }); else t.push({ k: 'o', v: m[4] }); }
    return t;
  }
  function celParse(src) {
    var t = celTok(src), p = 0;
    function pk() { return t[p]; } function eat(v) { var x = t[p]; if (v !== undefined && (!x || x.v !== v)) throw new Error('CEL syntax error: expected "' + v + '"'); p++; return x; }
    function is(v) { return t[p] && t[p].k === 'o' && t[p].v === v; }
    function cond() { var c = or(); if (is('?')) { eat(); var a = cond(); eat(':'); var b = cond(); return { t: 'c', c: c, a: a, b: b }; } return c; }
    function or() { var l = and(); while (is('||')) { eat(); l = { t: 'or', l: l, r: and() }; } return l; }
    function and() { var l = rel(); while (is('&&')) { eat(); l = { t: 'and', l: l, r: rel() }; } return l; }
    function rel() { var l = add(); while (t[p] && ((t[p].k === 'o' && /^(==|!=|<=|>=|<|>)$/.test(t[p].v)) || (t[p].k === 'i' && t[p].v === 'in'))) { var o = eat().v; l = { t: 'b', o: o, l: l, r: add() }; } return l; }
    function add() { var l = mul(); while (is('+') || is('-')) { var o = eat().v; l = { t: 'b', o: o, l: l, r: mul() }; } return l; }
    function mul() { var l = un(); while (is('*') || is('/') || is('%')) { var o = eat().v; l = { t: 'b', o: o, l: l, r: un() }; } return l; }
    function un() { if (is('!')) { eat(); return { t: 'not', e: un() }; } if (is('-')) { eat(); return { t: 'neg', e: un() }; } return post(); }
    function args() { var a = []; eat('('); while (!is(')')) { a.push(cond()); if (is(',')) eat(); } eat(')'); return a; }
    function post() {
      var e = prim();
      for (;;) {
        if (is('.')) { eat(); var n = eat(); if (n.k !== 'i') throw new Error('CEL syntax error after "."'); if (is('(')) e = { t: 'm', o: e, n: n.v, a: args() }; else e = { t: 'f', o: e, n: n.v }; }
        else if (is('[')) { eat(); var ix = cond(); eat(']'); e = { t: 'ix', o: e, i: ix }; }
        else return e;
      }
    }
    function prim() {
      var x = t[p]; if (!x) throw new Error('CEL syntax error: unexpected end');
      if (x.k === 'n') { p++; return { t: 'l', v: x.v }; } if (x.k === 's') { p++; return { t: 'l', v: x.v }; }
      if (x.k === 'i') { p++; if (x.v === 'true') return { t: 'l', v: true }; if (x.v === 'false') return { t: 'l', v: false }; if (x.v === 'null') return { t: 'l', v: null }; if (is('(')) return { t: 'fn', n: x.v, a: args() }; return { t: 'v', n: x.v }; }
      if (is('(')) { eat(); var e = cond(); eat(')'); return e; }
      if (is('[')) { eat(); var a = []; while (!is(']')) { a.push(cond()); if (is(',')) eat(); } eat(']'); return { t: 'list', a: a }; }
      throw new Error('CEL syntax error near "' + x.v + '"');
    }
    var r = cond(); if (p < t.length) throw new Error('CEL syntax error near "' + t[p].v + '"'); return r;
  }
  function celEval(n, env) {
    var NO = function (k) { return new Error('no such key: ' + k); };
    switch (n.t) {
      case 'l': return n.v; case 'list': return n.a.map(function (x) { return celEval(x, env); });
      case 'v': if (!(n.n in env)) throw new Error('undeclared reference to \'' + n.n + '\''); return env[n.n];
      case 'f': { var o = celEval(n.o, env); if (o === null || o === undefined || typeof o !== 'object' || !(n.n in o)) throw NO(n.n); return o[n.n]; }
      case 'ix': { var o2 = celEval(n.o, env), i = celEval(n.i, env); if (o2 === null || o2 === undefined || !(i in Object(o2)) ) throw NO(i); return o2[i]; }
      case 'not': return !celEval(n.e, env); case 'neg': return -celEval(n.e, env);
      case 'c': return celEval(n.c, env) ? celEval(n.a, env) : celEval(n.b, env);
      case 'and': { var l = celEval(n.l, env); if (l === false) return false; var r = celEval(n.r, env); return l && r; }
      case 'or': { var l2; try { l2 = celEval(n.l, env); } catch (e) { var r3 = celEval(n.r, env); if (r3 === true) return true; throw e; } if (l2 === true) return true; return celEval(n.r, env); }
      case 'b': { var a = celEval(n.l, env), b = celEval(n.r, env);
        switch (n.o) { case '==': return JSON.stringify(a) === JSON.stringify(b); case '!=': return JSON.stringify(a) !== JSON.stringify(b); case '<': return a < b; case '<=': return a <= b; case '>': return a > b; case '>=': return a >= b; case '+': return Array.isArray(a) ? a.concat(b) : a + b; case '-': return a - b; case '*': return a * b; case '/': return Math.trunc(a / b); case '%': return a % b; case 'in': return Array.isArray(b) ? b.some(function (x) { return JSON.stringify(x) === JSON.stringify(a); }) : (b !== null && typeof b === 'object' && a in b); } break; }
      case 'fn': {
        if (n.n === 'has') { var tgt = n.a[0]; if (tgt.t !== 'f') throw new Error('has() argument must be a field selection'); var ob; try { ob = celEval(tgt.o, env); } catch (e) { return false; } return ob !== null && typeof ob === 'object' && tgt.n in ob && ob[tgt.n] !== undefined; }
        var v = n.a.map(function (x) { return celEval(x, env); });
        if (n.n === 'size') return (typeof v[0] === 'object' && v[0] !== null && !Array.isArray(v[0])) ? Object.keys(v[0]).length : v[0].length;
        if (n.n === 'int') return Math.trunc(Number(v[0])); if (n.n === 'double') return Number(v[0]); if (n.n === 'string') return String(v[0]);
        throw new Error('undeclared reference to function \'' + n.n + '\''); }
      case 'm': {
        var rcv = celEval(n.o, env), nm = n.n;
        if (/^(all|exists|exists_one|filter|map)$/.test(nm)) {
          var vn = n.a[0].n, body = n.a[nm === 'map' && n.a.length > 2 ? 2 : 1], items = Array.isArray(rcv) ? rcv : Object.keys(rcv || {}), sub = function (it) { var e2 = Object.create(env); e2[vn] = it; return e2; };
          if (nm === 'all') return items.every(function (it) { return celEval(body, sub(it)) === true; }); if (nm === 'exists') return items.some(function (it) { return celEval(body, sub(it)) === true; });
          if (nm === 'exists_one') return items.filter(function (it) { return celEval(body, sub(it)) === true; }).length === 1;
          if (nm === 'filter') return items.filter(function (it) { return celEval(body, sub(it)) === true; }); return items.map(function (it) { return celEval(body, sub(it)); });
        }
        var av = n.a.map(function (x) { return celEval(x, env); });
        switch (nm) { case 'startsWith': return String(rcv).indexOf(av[0]) === 0; case 'endsWith': return String(rcv).slice(-av[0].length) === av[0] || av[0] === ''; case 'contains': return String(rcv).indexOf(av[0]) >= 0; case 'matches': return new RegExp(av[0]).test(String(rcv)); case 'lowerAscii': return String(rcv).toLowerCase(); case 'upperAscii': return String(rcv).toUpperCase(); case 'size': return rcv.length; }
        throw new Error('undeclared reference to method \'' + nm + '\''); }
    }
    throw new Error('CEL: unsupported expression');
  }
  Sim.cel = { parse: celParse, evalNode: celEval, eval: function (src, env) { return celEval(celParse(src), env); } };

  // ── ValidatingAdmissionPolicy (v1): policy + binding pair. Deny blocks; Warn/Audit are accepted but not surfaced. A policy with no binding enforces nothing. ──
  function vapRuleMatch(rules, d, op) {
    return (rules || []).some(function (r) {
      var gOk = !r.apiGroups || r.apiGroups.some(function (g) { return g === '*' || g === (d.group || ''); });
      var rOk = !r.resources || r.resources.some(function (x) { var b = String(x).split('/')[0]; return x === '*' || b === d.plural; });
      var oOk = !r.operations || r.operations.some(function (o) { return o === '*' || o === op; });
      return gOk && rOk && oOk;
    });
  }
  function vapCheck(sim, obj, op, old) {
    var bs = sim.list('ValidatingAdmissionPolicyBinding'); if (!bs.length || !obj || !obj.metadata || obj.kind === 'ValidatingAdmissionPolicy' || obj.kind === 'ValidatingAdmissionPolicyBinding') return;
    var d = sim.kindOf(obj); if (!d) return;
    var nsObj = d.ns && obj.metadata.namespace ? sim.get('Namespace', '', obj.metadata.namespace) : null;
    bs.forEach(function (b) {
      var pol = sim.get('ValidatingAdmissionPolicy', '', b.spec && b.spec.policyName); if (!pol) return;
      var acts = b.spec.validationActions || []; if (acts.indexOf('Deny') < 0) return;
      var mc = pol.spec.matchConstraints || {}, rules = mc.resourceRules || [];
      if (!vapRuleMatch(rules, d, op)) return;
      var bm = b.spec.matchResources || {};
      if (bm.namespaceSelector && Object.keys(bm.namespaceSelector).length && d.ns) { if (!matchSel0(bm.namespaceSelector, (nsObj && nsObj.metadata.labels) || {})) return; }
      if (mc.namespaceSelector && Object.keys(mc.namespaceSelector).length && d.ns) { if (!matchSel0(mc.namespaceSelector, (nsObj && nsObj.metadata.labels) || {})) return; }
      var os = bm.objectSelector || mc.objectSelector; if (os && Object.keys(os).length && !matchSel0(os, obj.metadata.labels || {})) return;
      var params = null, pk = pol.spec.paramKind, pr = b.spec.paramRef;
      if (pk && pr && pr.name) { var pd = sim.findKind(pk.kind); params = pd ? sim.get(pd.kind, pr.namespace || (pd.ns ? 'default' : ''), pr.name) : null; if (!params && pr.parameterNotFoundAction !== 'Allow') throw new KErr('Error from server (Forbidden): ValidatingAdmissionPolicy \'' + pol.metadata.name + '\' with binding \'' + b.metadata.name + '\' denied request: failed to configure binding: no params found for policy binding with `Deny` parameterNotFoundAction'); }
      var env = { object: clone0(obj), oldObject: old ? clone0(old) : null, request: { operation: op, namespace: obj.metadata.namespace || '', name: obj.metadata.name || '', userInfo: { username: sim.asUser || 'kubernetes-admin' } }, params: params ? clone0(params) : null, namespaceObject: nsObj ? clone0(nsObj) : null };
      var vars = {}; (pol.spec.variables || []).forEach(function (v) { try { vars[v.name] = Sim.cel.eval(v.expression, Object.assign({}, env, { variables: vars })); } catch (e) { vars[v.name] = undefined; } }); env.variables = vars;
      (pol.spec.matchConditions || []).forEach(function (mcd) { void mcd; });
      var skip = (pol.spec.matchConditions || []).some(function (mcd) { try { return Sim.cel.eval(mcd.expression, env) !== true; } catch (e) { return true; } });
      if (skip) return;
      (pol.spec.validations || []).forEach(function (v) {
        var okv, why = '';
        try { okv = Sim.cel.eval(v.expression, env); } catch (e) { okv = false; why = ' (evaluation error: ' + e.message + ')'; if ((pol.spec.failurePolicy || 'Fail') === 'Ignore' && !/^no such key/.test(e.message)) return; }
        if (okv !== true) {
          var msg = v.message || ('failed expression: ' + String(v.expression).trim());
          if (v.messageExpression) { try { msg = String(Sim.cel.eval(v.messageExpression, env)); } catch (e) { /* fall back to message */ } }
          var reason = v.reason === 'Forbidden' ? 'Forbidden' : (v.reason === 'Unauthorized' ? 'Unauthorized' : 'Invalid');
          var kindName = d.plural + (d.group ? '.' + d.group : '');
          throw new KErr('Error from server (' + reason + '): ' + kindName + ' "' + (obj.metadata.name || obj.metadata.generateName || '') + '" is invalid: : ValidatingAdmissionPolicy \'' + pol.metadata.name + '\' with binding \'' + b.metadata.name + '\' denied request: ' + msg + (why && !v.message ? why : ''));
        }
      });
    });
  }
  // CREATE (also covers controller-made pods) …
  var cr1 = P.createRaw;
  P.createRaw = function (obj) { if (obj && obj.metadata && !this._vapOff) { this.defaults && 0; vapCheck(this, obj, 'CREATE', null); } return cr1.apply(this, arguments); };
  // … UPDATE: any kubectl verb that changed an existing object is validated afterwards (immutable ConfigMap/Secret, PVC resize rules,
  //   ValidatingAdmissionPolicy) and the whole command is rolled back when denied.
  var STORQ = function (x) { return Sim.util.parseStorage ? Sim.util.parseStorage(x) : parseStorageLocal(x); };
  function parseStorageLocal(q) { var m = String(q || '0').match(/^([0-9.]+)\s*([KMGTP]i?)?/); if (!m) return 0; var u = { '': 1, K: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15, Ki: 1024, Mi: 1048576, Gi: 1073741824, Ti: 1099511627776, Pi: 1125899906842624 }; return parseFloat(m[1]) * (u[m[2] || ''] || 1); }
  var postMutation = function (sim, o, oldO) {
    var nm = o.metadata.name;
    if ((o.kind === 'ConfigMap' || o.kind === 'Secret') && oldO.immutable === true) {
      var kind = o.kind, bad = o.immutable !== true || JSON.stringify(o.data || {}) !== JSON.stringify(oldO.data || {}) || JSON.stringify(o.binaryData || {}) !== JSON.stringify(oldO.binaryData || {}) || (kind === 'Secret' && o.type !== oldO.type);
      if (bad) throw new KErr('The ' + kind + ' "' + nm + '" is invalid: ' + (o.immutable !== true ? 'immutable' : 'data') + ': Forbidden: field is immutable when `immutable` is set');
    }
    if (o.kind === 'PersistentVolumeClaim' && o.spec && oldO.spec) {
      var nw = (o.spec.resources || {}).requests && o.spec.resources.requests.storage, od = (oldO.spec.resources || {}).requests && oldO.spec.resources.requests.storage;
      if (nw && od && nw !== od) {
        var bound = (oldO.status || {}).phase === 'Bound', capNow = bound && oldO.status.capacity && oldO.status.capacity.storage;
        if (bound && STORQ(nw) < STORQ(capNow || od)) throw new KErr('The PersistentVolumeClaim "' + nm + '" is invalid: spec.resources.requests.storage: Forbidden: field can not be less than status.capacity');
        if (bound) { var sc = sim.get('StorageClass', '', oldO.spec.storageClassName); if (!sc || sc.allowVolumeExpansion !== true) throw new KErr('Error from server (Forbidden): persistentvolumeclaims "' + nm + '" is forbidden: only dynamically provisioned pvc can be resized and the storageclass that provisions the pvc must support resize'); }
      }
    }
  };
  var ki0 = P.kubectlInner;
  P.kubectlInner = function (args, stdin) {
    var mut = /(^|\s)(apply|patch|edit|scale|set|label|annotate|replace|rollout|autoscale|taint|cordon|uncordon|expose|debug)(\s|$)/.test(Array.isArray(args) ? args.join(' ') : String(args));
    if (!mut) return ki0.apply(this, arguments);
    var before = {}, self = this; Object.keys(this.objs).forEach(function (k) { before[k] = JSON.stringify(self.objs[k]); });
    var snap = clone0(this.objs), res = ki0.apply(this, arguments), vap = this.list('ValidatingAdmissionPolicyBinding').length > 0;
    try {
      Object.keys(this.objs).forEach(function (k) { if (before[k] === undefined || before[k] === JSON.stringify(self.objs[k])) return; var o = self.objs[k], oldO = JSON.parse(before[k]);
        postMutation(self, o, oldO, Array.isArray(args) ? args.join(' ') : String(args));
        if (vap && (JSON.stringify(o.spec) !== JSON.stringify(oldO.spec) || JSON.stringify(o.metadata.labels) !== JSON.stringify(oldO.metadata.labels) || JSON.stringify(o.data) !== JSON.stringify(oldO.data))) vapCheck(self, o, 'UPDATE', oldO); });
    } catch (e) { if (e instanceof KErr) { this.objs = snap; this.changed && this.changed(); return { stdout: '', stderr: e.message.replace(/\n?$/, '\n'), code: e.code || 1 }; } throw e; }
    return res;
  };

  // ── PVC online expansion: a Bound claim whose request grew (and whose StorageClass allows it) gets its capacity raised by the controller ──
  var rp0 = P.recPvc;
  P.recPvc = function (c) {
    if (c.status && c.status.phase === 'Bound' && c.spec.resources && c.spec.resources.requests && c.status.capacity) {
      var want = c.spec.resources.requests.storage, have = c.status.capacity.storage;
      if (want && have && STORQ(want) > STORQ(have)) { var pv = this.get('PersistentVolume', '', c.spec.volumeName), sc = this.get('StorageClass', '', c.spec.storageClassName); if (pv && sc && sc.allowVolumeExpansion === true) { pv.spec.capacity.storage = want; c.status.capacity.storage = want; this.ev(c, 'Normal', 'FileSystemResizeSuccessful', 'MountVolume.NodeExpandVolume succeeded for volume "' + pv.metadata.name + '"'); } }
    }
    return rp0.apply(this, arguments);
  };

  // ── NetworkPolicy: ipBlock (cidr + except), port ranges (endPort), protocol, and the from/to element semantics:
  //    one element with namespaceSelector AND podSelector = both must match; separate elements = either (OR). ──
  function ip2n(ip) { var p = String(ip || '').split('.').map(Number); return p.length === 4 && p.every(function (x) { return x >= 0 && x < 256; }) ? ((p[0] * 16777216) + (p[1] * 65536) + (p[2] * 256) + p[3]) : null; }
  function inCidr(ip, cidr) { var m = String(cidr).split('/'), a = ip2n(ip), b = ip2n(m[0]), bits = m[1] === undefined ? 32 : +m[1]; if (a === null || b === null) return false; var sz = Math.pow(2, 32 - bits); return Math.floor(a / sz) === Math.floor(b / sz); }
  function peerOk(sim, f, peer, peerNs, ownNs) {
    if (f.ipBlock) { var ip = (peer.status || {}).podIP; return inCidr(ip, f.ipBlock.cidr) && !(f.ipBlock.except || []).some(function (c) { return inCidr(ip, c); }); }
    var nsOk = true, podOk = true;
    if (f.namespaceSelector !== undefined) { var no = sim.get('Namespace', '', peerNs); nsOk = matchSel0(f.namespaceSelector, (no && no.metadata.labels) || {}); } else nsOk = peerNs === ownNs;
    if (f.podSelector !== undefined) podOk = matchSel0(f.podSelector, peer.metadata.labels || {});
    return nsOk && podOk;
  }
  function portOk2(rule, port, proto) {
    if (!rule.ports || !rule.ports.length) return true;
    return rule.ports.some(function (p) {
      if (p.protocol && proto && String(p.protocol).toUpperCase() !== String(proto).toUpperCase()) return false;
      if (p.port === undefined) return true; var lo = Number(p.port), hi = p.endPort !== undefined ? Number(p.endPort) : lo, n = Number(port);
      if (isNaN(lo)) return String(p.port) === String(port); return n >= lo && n <= hi;
    });
  }
  P.netpolAllows = function (from, to, port) {
    var self = this, pols = this.list('NetworkPolicy', to.metadata.namespace).filter(function (np) { return (np.spec.policyTypes || ['Ingress']).indexOf('Ingress') >= 0 && matchSel0(np.spec.podSelector, to.metadata.labels); });
    if (!pols.length) return true;
    return pols.some(function (np) { return (np.spec.ingress || []).some(function (rule) { if (!portOk2(rule, port)) return false; if (!rule.from || !rule.from.length) return true; return rule.from.some(function (f) { return peerOk(self, f, from, from.metadata.namespace, to.metadata.namespace); }); }); });
  };
  P.egressAllows = function (from, to, port) {
    var self = this, pols = this.list('NetworkPolicy', from.metadata.namespace).filter(function (np) { return (np.spec.policyTypes || []).indexOf('Egress') >= 0 && matchSel0(np.spec.podSelector, from.metadata.labels); });
    if (!pols.length) return true;
    return pols.some(function (np) { return (np.spec.egress || []).some(function (rule) { if (!portOk2(rule, port)) return false; if (!rule.to || !rule.to.length) return true; return rule.to.some(function (f) { return peerOk(self, f, to, to.metadata.namespace, from.metadata.namespace); }); }); });
  };

  // ── kubectl debug: ephemeral container, --copy-to pod copy, node debugger pod. Non-interactive: `-it` prints the banner and, with `-- cmd`, runs cmd. ──
  var dbgN = 0;
  function dbgName(sim, pod) { dbgN++; var h = 0, t = String(pod.metadata.uid || pod.metadata.name) + dbgN; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; var cs = 'bcdfghjklmnpqrstvwxz2456789', o = ''; for (i = 0; i < 5; i++) { o += cs[h % cs.length]; h = Math.floor(h / cs.length) + 7919 * (i + 1); } return 'debugger-' + o; }
  P.kDebug = function (a) {
    var f = a.flags, ns = f.n || this.ctxNs, tgt = a.pos[0], self = this, img = typeof f.image === 'string' ? f.image : null, cname = typeof f.container === 'string' ? f.container : (typeof f.c === 'string' ? f.c : null), cmd = a.rest;
    if (!tgt) throw new KErr('error: expected pod or node name\nSee \'kubectl debug -h\' for help and examples');
    var isNode = /^(node|nodes|no)\//.test(tgt); tgt = tgt.replace(/^(pod|pods|po|node|nodes|no)\//, '');
    if (isNode) {
      var nd = this.get('Node', '', tgt); if (!nd) throw this.notFound(this.findKind('node'), tgt);
      if (!img) throw new KErr('error: --image is required when debugging a node');
      var pn = 'node-debugger-' + tgt + '-' + dbgName(this, nd).slice(9), c = { name: 'debugger', image: img, stdin: true, tty: true, volumeMounts: [{ name: 'host-root', mountPath: '/host' }] };
      if (cmd && cmd.length) c.command = cmd.slice();
      var pod = { apiVersion: 'v1', kind: 'Pod', metadata: { name: pn, namespace: ns, labels: {} }, spec: { containers: [c], nodeName: tgt, hostNetwork: true, hostPID: true, hostIPC: true, restartPolicy: 'Never', tolerations: [{ operator: 'Exists' }], volumes: [{ name: 'host-root', hostPath: { path: '/' } }] } };
      this.createRaw(pod); this.settle(3);
      return 'Creating debugging pod ' + pn + ' with container debugger on node ' + tgt + '.\n' + (f.stdin && f.tty && !(cmd && cmd.length) ? 'If you don\'t see a command prompt, try pressing enter.\n' : '');
    }
    var p = this.get('Pod', ns, tgt); if (!p) throw new KErr('Error from server (NotFound): pods "' + tgt + '" not found');
    if (f['copy-to']) {
      var nm = String(f['copy-to']); if (this.get('Pod', ns, nm)) throw new KErr('Error from server (AlreadyExists): pods "' + nm + '" already exists');
      var cp = clone0(p); cp.metadata = { name: nm, namespace: ns, labels: f['keep-labels'] ? clone0(p.metadata.labels || {}) : {}, annotations: {} }; delete cp.status; cp.status = undefined; delete cp.spec.nodeName;
      if (typeof f['set-image'] === 'string') f['set-image'].split(',').forEach(function (kv) { var m = kv.split('='); cp.spec.containers.forEach(function (c) { if (m[0] === '*' || m[0] === c.name) c.image = m[1]; }); });
      var dbgC = null, added = '';
      if (img && !f['set-image']) { added = cname || dbgName(self, p); dbgC = { name: added, image: img, stdin: true, tty: true }; if (cmd && cmd.length) dbgC.command = cmd.slice(); cp.spec.containers.push(dbgC); cp.spec.shareProcessNamespace = f['share-processes'] === false ? false : true; }
      else if (cmd && cmd.length) { var tc = cp.spec.containers.filter(function (c) { return !cname || c.name === cname; })[0]; if (tc) { tc.command = cmd.slice(); delete tc.args; } }
      if (f['share-processes']) cp.spec.shareProcessNamespace = true;
      delete cp.spec.nodeName; this.createRaw(cp); this.settle(3);
      return (added && !cname ? 'Defaulting debug container name to ' + added + '.\n' : '') + (f.stdin && f.tty ? 'If you don\'t see a command prompt, try pressing enter.\n' : '');
    }
    if (!img) throw new KErr('error: you must specify an image when adding an ephemeral container (--image=IMAGE)');
    if (p.status.phase !== 'Running') throw new KErr('error: cannot debug: pod ' + tgt + ' is ' + (p.status.phase || 'not running') + ', ephemeral containers can only be added to a Running pod');
    var name = cname || dbgName(this, p), tcn = typeof f.target === 'string' ? f.target : undefined;
    if (tcn && !p.spec.containers.some(function (c) { return c.name === tcn; })) throw new KErr('error: container ' + tcn + ' not found in pod ' + tgt);
    p.spec.ephemeralContainers = p.spec.ephemeralContainers || [];
    if (p.spec.ephemeralContainers.some(function (e) { return e.name === name; })) throw new KErr('Error from server (Invalid): Pod "' + tgt + '" is invalid: spec.ephemeralContainers[0].name: Duplicate value: "' + name + '"  (an ephemeral container name can only be used once)');
    var ec = { name: name, image: img, imagePullPolicy: 'IfNotPresent', stdin: !!f.stdin, tty: !!f.tty, terminationMessagePolicy: 'File' }; if (tcn) ec.targetContainerName = tcn; if (cmd && cmd.length) ec.command = cmd.slice();
    p.spec.ephemeralContainers.push(ec);
    var bad = Sim.util.imageProblem(img), ran = cmd && cmd.length;
    p.status.ephemeralContainerStatuses = (p.status.ephemeralContainerStatuses || []).concat([{ name: name, image: img, imageID: '', ready: false, restartCount: 0, state: bad ? { waiting: { reason: 'ImagePullBackOff', message: 'Back-off pulling image "' + img + '"' } } : (ran ? { terminated: { exitCode: 0, reason: 'Completed' } } : { running: { startedAt: this.nowIso ? this.nowIso() : new Date().toISOString() } }) }]);
    this.changed && this.changed();
    var o = (cname ? '' : 'Defaulting debug container name to ' + name + '.\n');
    if (ran && !bad) { var r = this.kExec({ pos: [tgt], rest: cmd, flags: { n: ns } }); o += typeof r === 'string' ? r : (r.stdout || ''); }
    else if (f.stdin && f.tty && !bad) o += 'If you don\'t see a command prompt, try pressing enter.\n';
    return o;
  };
  // describe: show ephemeral containers
  var dp0 = P.kDescribe;
  P.kDescribe = function (a) { var out = dp0.apply(this, arguments); if (typeof out !== 'string') return out; var t = String((a.pos || [])[0] || '').toLowerCase();
    if (!/^(pod|pods|po)(\/.*)?$/.test(t) && !(a.pos[1] && /^(pod|pods|po)$/.test(t))) return out;
    var name = a.pos[1] || String(a.pos[0]).split('/')[1], p = name && this.get('Pod', a.flags.n || this.ctxNs, name); if (!p || !(p.spec.ephemeralContainers || []).length) return out;
    var blk = 'Ephemeral Containers:\n' + p.spec.ephemeralContainers.map(function (e) { var st = ((p.status.ephemeralContainerStatuses || []).filter(function (x) { return x.name === e.name; })[0] || {}).state || {}; var k = Object.keys(st)[0] || 'Waiting'; return '  ' + e.name + ':\n    Image:          ' + e.image + '\n    Port:           <none>\n    State:          ' + (k[0].toUpperCase() + k.slice(1)) + (st.terminated ? '\n      Reason:       ' + st.terminated.reason + '\n      Exit Code:    ' + st.terminated.exitCode : '') + '\n' + (e.targetContainerName ? '    Target:         ' + e.targetContainerName + '\n' : ''); }).join('');
    return out.indexOf('\nConditions:') >= 0 ? out.replace('\nConditions:', '\n' + blk + 'Conditions:') : out + blk; };

  // ── in-place pod resize: spec.containers[*].resources may change ONLY through the `resize` subresource; the QoS class may not change;
  //    a request that fits no node is left Pending (PodResizePending/Infeasible) and the running size does not change. ──
  function qosOf(p) { var all = (p.spec.containers || []), g = all.length > 0, b = true; all.forEach(function (c) { var r = c.resources || {}, rq = r.requests || {}, lm = r.limits || {}; if (rq.cpu || rq.memory || lm.cpu || lm.memory) b = false; if (!(lm.cpu && lm.memory && (rq.cpu === undefined || rq.cpu === lm.cpu) && (rq.memory === undefined || rq.memory === lm.memory))) g = false; }); return g ? 'Guaranteed' : (b ? 'BestEffort' : 'Burstable'); }
  var pm0 = postMutation;
  postMutation = function (sim, o, oldO, args) {
    pm0(sim, o, oldO);
    if (o.kind === 'Pod' && JSON.stringify((o.spec.containers || []).map(function (c) { return c.resources; })) !== JSON.stringify((oldO.spec.containers || []).map(function (c) { return c.resources; }))) {
      if (!/--subresource[= ]resize/.test(args)) throw new KErr('The Pod "' + o.metadata.name + '" is invalid: spec: Forbidden: pod updates may not change fields other than `spec.containers[*].image`, `spec.initContainers[*].image`, `spec.activeDeadlineSeconds`, `spec.tolerations` (only additions to existing tolerations), `spec.terminationGracePeriodSeconds` (allow it to be set to 1 if it was previously negative)\n  (to change CPU/memory of a running container use: kubectl patch pod NAME --subresource resize --patch ...)');
      if (qosOf(o) !== qosOf(oldO)) throw new KErr('The Pod "' + o.metadata.name + '" is invalid: Pod QOS Class may not change as a result of resizing');
      var nd = sim.get('Node', '', o.spec.nodeName), alloc = nd && nd.status && nd.status.allocatable || {}, U0 = Sim.util, cpu = 0, mem = 0;
      o.spec.containers.forEach(function (c) { var rq = (c.resources || {}).requests || {}; cpu += U0.parseCpu(rq.cpu || 0); mem += U0.parseMem(rq.memory || 0); });
      var infeasible = nd && (cpu > U0.parseCpu(alloc.cpu || '4') || mem > U0.parseMem(alloc.memory || '8Gi'));
      o.status.conditions = (o.status.conditions || []).filter(function (c) { return c.type !== 'PodResizePending' && c.type !== 'PodResizeInProgress'; });
      if (infeasible) { o.status.conditions.push({ type: 'PodResizePending', status: 'True', reason: 'Infeasible', message: 'Node didn\'t have enough capacity: requested ' + (cpu >= U0.parseCpu(alloc.cpu || '4') ? 'cpu' : 'memory') + ' exceeds node allocatable' }); o._alloc = o._alloc || {}; oldO.spec.containers.forEach(function (c) { if (!o._alloc[c.name]) o._alloc[c.name] = clone0(c.resources || {}); }); }
      else { delete o._alloc; o._rcx = o._rcx || {}; o.spec.containers.forEach(function (c, i) { var oc = oldO.spec.containers[i] || {}, rp = (c.resizePolicy || []).filter(function (x) { return x.resourceName === 'memory'; })[0], mk = function (cc) { var r = cc.resources || {}; return JSON.stringify([(r.requests || {}).memory, (r.limits || {}).memory]); }; if (rp && rp.restartPolicy === 'RestartContainer' && mk(c) !== mk(oc)) o._rcx[c.name] = (o._rcx[c.name] || 0) + 1; }); }
    }
  };

  // ── list the CSR kind sorted/printed like kubectl: nothing extra needed (cols table registered in sim-kubectl.js) ──
/* --dry-run=server: run the real command (admission policies, quotas, immutability) on a throw-away copy, then discard it. */
{
  var k0 = P.kubectlInner;
  P.kubectlInner = function (args, stdin) {
    var txt = Array.isArray(args) ? args.join(' ') : String(args);
    if (!/--dry-run(=|\s+)server/.test(txt) || !/(^|\s)(create|apply|patch|replace|label|annotate|scale|set|taint|autoscale|expose)(\s|$)/.test(txt)) return k0.apply(this, arguments);
    var clean = Array.isArray(args) ? args.filter(function (x) { return !/^--dry-run(=server)?$/.test(x) && x !== 'server'; }) : txt.replace(/--dry-run(=|\s+)server/, '');
    var tmp = new this.constructor(); tmp.load(JSON.parse(JSON.stringify(this.dump())));
    var r = tmp.kubectl(clean, stdin);
    if (r.code === 0) r.stdout = r.stdout.replace(/\n$/, '').split('\n').map(function (l) { return /dry run/.test(l) ? l : l + ' (server dry run)'; }).join('\n') + '\n';
    return r;
  };
}
})(typeof window !== 'undefined' ? window : globalThis);
