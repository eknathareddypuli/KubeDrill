/* Version-aware labs. Which Kubernetes minor version made each feature usable, so a learner can say "my cluster / exam is 1.XX"
   and see which labs depend on something newer. The exam version is NOT hard-coded: the Linux Foundation moves it, so the
   learner sets their own target and checks the official exam page. Stage data from the Kubernetes release notes and KEPs.
   `on` = first minor where the feature works without turning on a feature gate; `ga` = stable. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {};
  var FEATURES = [
    { id: 'sidecar', name: 'Native sidecar containers (restartable init containers)', test: function (t) { return /initContainers/.test(t) && /restartPolicy\W{1,6}Always/.test(t); }, alpha: '1.28', on: '1.29', ga: '1.33', note: 'Beta and on by default from 1.29, stable in 1.33. Before 1.29 the gate SidecarContainers must be enabled.' },
    { id: 'resize', name: 'In-place pod resize (resize subresource)', re: /--subresource[ =]resize|resizePolicy|in-place resize/i, alpha: '1.27', on: '1.33', ga: '1.35', note: 'Beta and on by default from 1.33, stable in 1.35. From 1.33 the change goes through the resize subresource, not a plain patch.' },
    { id: 'userns', name: 'User namespaces for pods (hostUsers: false)', re: /hostUsers/i, alpha: '1.25', on: '1.33', ga: null, note: 'Beta from 1.30 and on by default from 1.33. Needs a recent container runtime and kernel on a real cluster.' },
    { id: 'vap', name: 'ValidatingAdmissionPolicy (CEL admission rules)', re: /ValidatingAdmissionPolicy/i, alpha: '1.26', on: '1.30', ga: '1.30', note: 'Beta in 1.28 (off by default), stable and on by default in 1.30. The simulator supports a CEL subset and the Deny action only.' },
    { id: 'psa', name: 'Pod Security Admission (replaces PodSecurityPolicy)', re: /pod-security\.kubernetes\.io/i, alpha: '1.22', on: '1.23', ga: '1.25', note: 'Beta and on by default from 1.23, stable in 1.25, the release that removed PodSecurityPolicy.' },
    { id: 'ephemeral', name: 'Ephemeral containers and kubectl debug', re: /kubectl debug|ephemeralContainers/i, alpha: '1.16', on: '1.23', ga: '1.25', note: 'Beta and on by default from 1.23, stable in 1.25.' },
    { id: 'expand', name: 'Online PVC expansion', re: /allowVolumeExpansion/i, alpha: '1.8', on: '1.11', ga: '1.24', note: 'Needs a StorageClass with allowVolumeExpansion and a driver that supports it. Stable in 1.24.' },
    { id: 'cronjob', name: 'CronJob (batch/v1) and spec.timeZone', re: /cronjob/i, alpha: null, on: '1.21', ga: '1.21', note: 'batch/v1 CronJob since 1.21 (v1beta1 removed in 1.25). spec.timeZone is stable in 1.27.' },
    { id: 'endpointslice', name: 'EndpointSlices (replace Endpoints for scale)', re: /endpointslice/i, alpha: '1.16', on: '1.17', ga: '1.21', note: 'Stable in 1.21. kubectl get endpoints still works but is deprecated from 1.33.' },
    { id: 'netpolrange', name: 'NetworkPolicy endPort', re: /endPort/i, alpha: '1.21', on: '1.22', ga: '1.25', note: 'Port ranges in NetworkPolicy: beta in 1.22, stable in 1.25. Needs a CNI that enforces it.' },
    { id: 'hpav2', name: 'HorizontalPodAutoscaler autoscaling/v2', re: /autoscale|horizontalpodautoscaler|\bhpa\b/i, alpha: '1.12', on: '1.12', ga: '1.23', note: 'autoscaling/v2 is stable in 1.23 (v2beta2 removed in 1.26). Needs metrics-server to see CPU.' },
    { id: 'ingressv1', name: 'Ingress networking.k8s.io/v1', re: /kind: Ingress\b|create ingress|get ingress|"ingress\//i, alpha: null, on: '1.19', ga: '1.19', note: 'v1 since 1.19; v1beta1 was removed in 1.22. Needs an ingress controller to do anything.' },
    { id: 'token', name: 'Bound ServiceAccount tokens (kubectl create token)', re: /kubectl create token/i, alpha: null, on: '1.24', ga: '1.24', note: 'From 1.24 ServiceAccounts no longer get an auto-created token Secret: use kubectl create token.' },
    { id: 'immutable', name: 'Immutable ConfigMaps and Secrets', re: /immutable\W{1,6}true/i, alpha: '1.18', on: '1.19', ga: '1.21', note: 'Stable in 1.21. Cannot be edited back, only deleted and recreated.' },
    { id: 'pdb', name: 'PodDisruptionBudget policy/v1', re: /poddisruptionbudget|\bpdb\b/i, alpha: null, on: '1.21', ga: '1.21', note: 'policy/v1 since 1.21 (policy/v1beta1 removed in 1.25).' }
  ];
  function num(v) { var p = String(v).split('.'); return parseInt(p[0], 10) * 1000 + parseInt(p[1], 10); }
  function lbl(v) { return v ? String(v) : ''; }
  function text(lab) { return JSON.stringify([lab.title, lab.story, lab.caution, lab.setup, lab.setupCmds, lab.files, lab.tasks && lab.tasks.map(function (t) { return t.assert; }), lab.solution]); }
  var cache = {};
  function featuresOf(lab) {
    var id = lab.variantOf || lab.id; if (cache[id]) return cache[id];
    var base = lab.variantOf ? KL.Labs.byId[lab.variantOf] || lab : lab, t = text(base), out = [];
    FEATURES.forEach(function (f) { if (f.test ? f.test(t) : f.re.test(t)) out.push(f); });
    cache[id] = out; return out;
  }
  /** Only features that are recent enough to matter (default-on from 1.25 or later) are shown as labels; older ones are history. */
  function recentOf(lab) { return featuresOf(lab).filter(function (f) { return num(f.on) >= num('1.25'); }); }
  function status(lab, target) {
    if (!target) return { ok: true, blockers: [] };
    var tv = num(target), blockers = featuresOf(lab).filter(function (f) { return num(f.on) > tv; });
    return { ok: blockers.length === 0, blockers: blockers };
  }
  var KEY = 'kubedrill:target-version';
  function getTarget() { try { var v = localStorage.getItem(KEY); return /^1\.\d{2}$/.test(v || '') ? v : ''; } catch (e) { return ''; } }
  function setTarget(v) { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  var VERSIONS = ['1.28', '1.29', '1.30', '1.31', '1.32', '1.33', '1.34', '1.35', '1.36', '1.37'];
  KL.versions = { FEATURES: FEATURES, VERSIONS: VERSIONS, featuresOf: featuresOf, recentOf: recentOf, status: status, getTarget: getTarget, setTarget: setTarget, num: num, label: lbl };
  if (typeof module !== 'undefined' && module.exports) module.exports = KL.versions;
})(typeof window !== 'undefined' ? window : globalThis);
