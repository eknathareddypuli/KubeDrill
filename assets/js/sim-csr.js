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
    return kp0.apply(this, arguments);
  };

  // ── CSR validation at creation ──
  var cr0 = P.createRaw;
  P.createRaw = function (obj) {
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

  // ── list the CSR kind sorted/printed like kubectl: nothing extra needed (cols table registered in sim-kubectl.js) ──
})(typeof window !== 'undefined' ? window : globalThis);
