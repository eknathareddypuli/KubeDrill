/* Competency model: every lab is tagged with the skills it exercises. Powers the #coverage page.
   The skill lists are KubeDrill's own wording of the PUBLIC curriculum outlines (cncf.io) — not exam questions. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {};
  var C = {
    CKA: [
      ['Cluster architecture & installation', [['cka-rbac', 'Manage RBAC'], ['cka-kubeadm', 'Install / join nodes with kubeadm'], ['cka-upgrade', 'Upgrade a cluster'], ['cka-etcd', 'Back up and restore etcd'], ['cka-ha', 'Highly available control plane'], ['cka-pkg', 'Helm and Kustomize'], ['cka-crd', 'CRDs and operators'], ['cka-ext', 'CNI, CSI and CRI extension points'], ['cka-certs', 'Certificates and kubeconfig'], ['cka-ctx', 'Contexts and namespaces']]],
      ['Workloads & scheduling', [['cka-deploy', 'Rolling updates and rollbacks'], ['cka-config', 'ConfigMaps and Secrets'], ['cka-hpa', 'Autoscaling'], ['cka-probes', 'Probes and self-healing'], ['cka-resources', 'Requests, limits and QoS'], ['cka-sched', 'Taints, affinity, selectors'], ['cka-priority', 'Priority and preemption'], ['cka-quota', 'ResourceQuota and LimitRange']]],
      ['Services & networking', [['cka-netpol', 'NetworkPolicy'], ['cka-svc', 'Services'], ['cka-ingress', 'Ingress'], ['cka-gateway', 'Gateway API'], ['cka-dns', 'CoreDNS'], ['cka-cni', 'Pod networking / CNI']]],
      ['Storage', [['cka-pv', 'PV and PVC'], ['cka-sc', 'StorageClass'], ['cka-reclaim', 'Reclaim policy and expansion'], ['cka-sts', 'StatefulSet storage']]],
      ['Troubleshooting', [['cka-node', 'Node failures'], ['cka-pod', 'Pod failures'], ['cka-logs', 'Logs and events'], ['cka-net', 'Network failures'], ['cka-cp', 'Control-plane failures'], ['cka-drain', 'Drain and maintenance']]],
      ['Exam technique', [['exam-docs', 'Documentation lookup (kubectl explain, kubernetes.io)']]]
    ],
    CKAD: [
      ['Application design & build', [['ckad-job', 'Jobs and CronJobs'], ['ckad-multi', 'Multi-container pods'], ['ckad-vol', 'Volumes'], ['ckad-image', 'Container images']]],
      ['Application deployment', [['ckad-deploy', 'Deployments and rollbacks'], ['ckad-bg', 'Blue/green and canary'], ['ckad-helm', 'Helm'], ['ckad-kust', 'Kustomize']]],
      ['Observability & maintenance', [['ckad-probe', 'Probes'], ['ckad-debug', 'Debugging pods'], ['ckad-api', 'API deprecations'], ['ckad-metrics', 'Resource usage']]],
      ['Environment, config & security', [['ckad-cm', 'ConfigMaps'], ['ckad-secret', 'Secrets'], ['ckad-sc', 'SecurityContext'], ['ckad-quota', 'Quotas'], ['ckad-sa', 'ServiceAccounts'], ['ckad-crd', 'CRDs']]],
      ['Services & networking', [['ckad-svc', 'Services'], ['ckad-ingress', 'Ingress'], ['ckad-netpol', 'NetworkPolicy']]],
      ['Exam technique', [['ckad-imp', 'Imperative commands'], ['ckad-jsonpath', 'JSONPath and output formats']]],
      ['Exam technique', [['exam-docs', 'Documentation lookup (kubectl explain, kubernetes.io)']]]
    ],
    CKS: [
      ['Cluster setup & hardening', [['cks-netpol', 'NetworkPolicy'], ['cks-rbac', 'RBAC least privilege'], ['cks-sa', 'ServiceAccount hardening'], ['cks-cis', 'CIS benchmark and API server flags'], ['cks-upgrade', 'Security patching and upgrades']]],
      ['System hardening', [['cks-seccomp', 'seccomp'], ['cks-apparmor', 'AppArmor'], ['cks-hostos', 'Host OS hardening']]],
      ['Minimize microservice vulnerabilities', [['cks-vap', 'Admission policy (ValidatingAdmissionPolicy, CEL)'], ['cks-userns', 'User namespaces for pods'], ['cks-psa', 'Pod Security Admission'], ['cks-priv', 'Privileged and securityContext'], ['cks-secrets', 'Secrets handling'], ['cks-etcdenc', 'Encryption at rest'], ['cks-sandbox', 'Sandboxed runtimes'], ['cks-mtls', 'mTLS']]],
      ['Supply chain security', [['cks-supply', 'Image pinning and policy'], ['cks-scan', 'Image scanning'], ['cks-static', 'Static manifest analysis']]],
      ['Monitoring & runtime security', [['cks-runtime', 'Runtime threat detection'], ['cks-auditlog', 'Audit logs']]],
      ['Exam technique', [['exam-docs', 'Documentation lookup (kubectl explain, kubernetes.io)']]]
    ]
  };
  var M = {
    's01-pending-cpu': 'cka-sched cka-resources cka-pod', 's02-imagepull': 'cka-pod ckad-debug ckad-image', 's03-oomkilled': 'cka-resources cka-pod', 's04-no-endpoints': 'cka-svc cka-net ckad-svc',
    's05-config-error': 'cka-config ckad-cm ckad-debug', 's06-rollout-rollback': 'cka-deploy ckad-deploy', 's07-scheduling': 'cka-sched', 's08-probes': 'cka-probes ckad-probe', 's09-jobs': 'ckad-job',
    's10-sidecar': 'ckad-multi ckad-vol', 's11-rbac-sa': 'cka-rbac cks-rbac ckad-sa', 's12-netpol-isolate': 'cka-netpol cks-netpol ckad-netpol', 's13-pvc-pending': 'cka-pv cka-sc', 's14-statefulset-pvc': 'cka-sts cka-pv',
    's15-quota-limits': 'cka-quota ckad-quota', 's16-hpa': 'cka-hpa', 's17-drain-cordon': 'cka-drain', 's18-secret-env': 'cka-config ckad-secret', 's19-ingress': 'cka-ingress ckad-ingress', 's20-pdb-spread': 'cka-sched cka-drain',
    's21-psa-restricted': 'cks-psa', 's22-sa-token': 'cks-sa ckad-sa', 's23-gateway-api': 'cka-gateway', 's24-crd': 'cka-crd ckad-crd', 's25-kustomize': 'cka-pkg ckad-kust', 's26-multitenant': 'cka-rbac cka-quota cka-netpol',
    's27-image-scan': 'cks-scan cks-supply', 's28-incident': 'cka-pod cka-svc cka-net', 's29-svc-targetport': 'cka-svc cka-net ckad-svc', 's30-wrong-namespace': 'cka-ctx ckad-imp', 's31-init-container': 'ckad-multi cka-pod',
    's32-cm-env-missing': 'ckad-cm ckad-debug', 's33-cm-volume': 'ckad-cm ckad-vol cka-config', 's34-nodeselector': 'cka-sched', 's35-taint-toleration': 'cka-sched', 's36-node-affinity': 'cka-sched', 's37-pod-antiaffinity': 'cka-sched',
    's38-memory-too-high': 'cka-resources cka-sched', 's39-rollout-revision': 'ckad-deploy cka-deploy', 's40-cronjob-fix': 'ckad-job', 's41-job-bad-image': 'ckad-job ckad-debug', 's42-daemonset-all-nodes': 'cka-sched',
    's43-headless-service': 'cka-sts cka-svc', 's44-static-pv': 'cka-pv cka-reclaim', 's45-hpa-wrong-target': 'cka-hpa', 's46-pdb-blocks-drain': 'cka-drain', 's47-limitrange-max': 'cka-quota', 's48-quota-pods': 'cka-quota',
    's49-clusterrole-nodes': 'cka-rbac', 's50-rolebinding-wrong-role': 'cka-rbac cks-rbac', 's51-netpol-egress': 'cks-netpol cka-netpol', 's52-netpol-namespace': 'cks-netpol cka-netpol', 's53-psa-baseline': 'cks-psa',
    's54-hostpath-baseline': 'cks-psa cks-priv', 's55-image-pull-secret': 'ckad-secret cka-config', 's56-rollout-restart-secret': 'ckad-secret cka-config', 's57-ingress-tls': 'cka-ingress ckad-ingress', 's58-nodeport-fixed': 'cka-svc ckad-svc',
    's59-externalname': 'cka-svc', 's60-canary-weights': 'ckad-bg ckad-deploy', 's61-blue-green': 'ckad-bg', 's62-kustomize-images': 'ckad-kust cka-pkg', 's63-etcd-backup': 'cka-etcd', 's64-jsonpath-nodes': 'ckad-jsonpath',
    's65-custom-columns': 'ckad-jsonpath', 's66-imperative-speedrun': 'ckad-imp', 's67-find-restarts': 'cka-logs cka-pod', 's68-multi-ns-cleanup': 'ckad-imp', 's69-stuck-terminating': 'cka-cp', 's70-kubelet-down': 'cka-node',
    's71-kubelet-swap': 'cka-node', 's72-dead-webhook': 'cka-cp', 's73-expired-certs': 'cka-certs', 's74-privileged-hunt': 'cks-priv cks-static', 's75-rbac-least-privilege': 'cks-rbac', 's76-image-hygiene': 'cks-supply',
    's77-hardened-pod': 'cks-priv ckad-sc', 's78-default-sa-admin': 'cks-sa cks-rbac', 's79-kubeadm-upgrade': 'cka-upgrade cka-kubeadm', 's80-node-replace': 'cka-kubeadm cka-node', 's81-disk-pressure': 'cka-node cka-resources',
    's82-coredns-down': 'cka-dns', 's83-lb-pending': 'cka-svc', 's84-service-ladder': 'cka-svc cka-net', 's85-priority-preemption': 'cka-priority', 's86-qos-eviction': 'cka-resources', 's87-rightsizing': 'cka-resources ckad-metrics',
    's88-hpa-vs-quota': 'cka-hpa cka-quota', 's89-context-namespace': 'cka-ctx', 's90-wrong-context': 'cka-ctx', 's91-black-friday': 'cka-pod cka-svc', 's92-silent-database': 'cka-pod cka-net', 's93-release-gone-wrong': 'cka-deploy cka-probes',
    's94-capacity-crunch': 'cka-sched cka-resources', 's95-pi-day-replay': 'cka-pod cka-net', 's96-two-nodes-down': 'cka-node', 's97-pv-retain': 'cka-reclaim cka-pv', 's98-drain-bare-pod': 'cka-drain', 's99-noexecute-eviction': 'cka-sched',
    's100-hpa-unknown': 'cka-hpa cka-resources', 's101-clusterrole-reuse': 'cka-rbac', 's102-httproute-fix': 'cka-gateway', 's103-job-parallel': 'ckad-job', 's104-cronjob-policy': 'ckad-job', 's105-startup-probe': 'cka-probes ckad-probe',
    's106-config-injection': 'ckad-cm ckad-secret cka-config', 's107-rolling-strategy': 'ckad-deploy cka-deploy', 's108-old-apiversion': 'ckad-api', 's109-seccomp-default': 'cks-seccomp ckad-sc', 's110-default-deny': 'cks-netpol',
    's111-secret-volume': 'cks-secrets ckad-secret', 's112-audit-hunt': 'cks-auditlog', 's113-open-binding': 'cks-rbac cks-sa', 's114-psa-rollout': 'cks-psa'
  };
  // skills a browser simulator cannot honestly teach — they need a real cluster (see the kind packs)
  var NOSIM = { 'cka-ha': 'Needs several real control-plane nodes', 'cka-ext': 'CNI/CSI/CRI are real plugins', 'cka-cni': 'Needs a real CNI', 'cks-mtls': 'Needs a service mesh', 'cks-hostos': 'Needs a real Linux host', 'cks-apparmor': 'Needs a kernel with AppArmor', 'cks-upgrade': 'Needs real node packages' };
  var map = {}; Object.keys(M).forEach(function (k) { map[k] = M[k].split(' '); });
  var meta = {}; Object.keys(C).forEach(function (t) { C[t].forEach(function (d) { d[1].forEach(function (c) { meta[c[0]] = { id: c[0], name: c[1], domain: d[0], track: t }; }); }); });
  KL.COMP = {
    tree: C, map: map, meta: meta, nosim: NOSIM,
    /** register tags for additional labs (new lab files call this) */
    add: function (o) { Object.keys(o).forEach(function (k) { map[k] = o[k].split(' '); }); },
    of: function (labId) { return map[labId] || []; },
    ids: function (track) { return Object.keys(meta).filter(function (k) { return meta[k].track === track; }); },
    /** labs that exercise a competency */
    labsFor: function (cid) { return Object.keys(map).filter(function (l) { return map[l].indexOf(cid) >= 0; }); }
  };
  // labs files that loaded before this file queued their tags here (S115-S129 did); apply them now
  if (KL.COMP_PENDING) { KL.COMP.add(KL.COMP_PENDING); KL.COMP_PENDING = null; }
  if (typeof module !== 'undefined' && module.exports) module.exports = KL.COMP;
})(typeof window !== 'undefined' ? window : globalThis);
