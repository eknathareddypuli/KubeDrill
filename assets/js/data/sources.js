/* Source credits: where each skill is documented upstream. Every lab shows the official pages for the skills it is tagged with
   (see competencies.js) plus a few lab-specific pages. Links go to kubernetes.io and the projects' own docs, which are also the pages
   you may open during the real exams. KubeDrill does not copy their text. Run `node tools/check-links.cjs` to test every link. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, K = 'https://kubernetes.io/docs/';
  function D(t, p) { return [t, /^https?:/.test(p) ? p : K + p]; }
  var BY_SKILL = {
    'cks-vap': [D('Validating Admission Policy', 'reference/access-authn-authz/validating-admission-policy/'), D('Common Expression Language in Kubernetes', 'reference/using-api/cel/')],
    'cks-userns': [D('User namespaces', 'concepts/workloads/pods/user-namespaces/'), D('Use a user namespace with a pod', 'tasks/configure-pod-container/user-namespaces/')],
    'exam-docs': [D('kubectl reference (explain)', 'reference/kubectl/generated/kubectl_explain/'), D('API reference', 'reference/kubernetes-api/')],
    'cka-rbac': [D('Using RBAC authorization', 'reference/access-authn-authz/rbac/')],
    'cka-kubeadm': [D('kubeadm reference', 'reference/setup-tools/kubeadm/')],
    'cka-upgrade': [D('Upgrading kubeadm clusters', 'tasks/administer-cluster/kubeadm/kubeadm-upgrade/'), D('Version skew policy', 'https://kubernetes.io/releases/version-skew-policy/')],
    'cka-etcd': [D('Operating etcd clusters', 'tasks/administer-cluster/configure-upgrade-etcd/')],
    'cka-ha': [D('Highly available topology', 'setup/production-environment/tools/kubeadm/ha-topology/')],
    'cka-pkg': [D('Kustomize', 'tasks/manage-kubernetes-objects/kustomization/'), D('Helm: using Helm', 'https://helm.sh/docs/intro/using_helm/')],
    'cka-crd': [D('Custom Resource Definitions', 'tasks/extend-kubernetes/custom-resources/custom-resource-definitions/')],
    'ckad-crd': [D('Custom Resource Definitions', 'tasks/extend-kubernetes/custom-resources/custom-resource-definitions/')],
    'cka-ext': [D('Extending Kubernetes', 'concepts/extend-kubernetes/')],
    'cka-certs': [D('Certificate signing requests', 'reference/access-authn-authz/certificate-signing-requests/'), D('Manage TLS certificates', 'tasks/tls/managing-tls-in-a-cluster/')],
    'cka-ctx': [D('Access multiple clusters', 'tasks/access-application-cluster/configure-access-multiple-clusters/')],
    'cka-deploy': [D('Deployments', 'concepts/workloads/controllers/deployment/')],
    'ckad-deploy': [D('Deployments', 'concepts/workloads/controllers/deployment/')],
    'cka-config': [D('ConfigMaps', 'concepts/configuration/configmap/')],
    'ckad-cm': [D('ConfigMaps', 'concepts/configuration/configmap/')],
    'ckad-secret': [D('Secrets', 'concepts/configuration/secret/')],
    'cka-hpa': [D('Horizontal Pod Autoscaling', 'tasks/run-application/horizontal-pod-autoscale/')],
    'cka-probes': [D('Liveness, readiness and startup probes', 'tasks/configure-pod-container/configure-liveness-readiness-startup-probes/')],
    'ckad-probe': [D('Liveness, readiness and startup probes', 'tasks/configure-pod-container/configure-liveness-readiness-startup-probes/')],
    'cka-resources': [D('Resource management for containers', 'concepts/configuration/manage-resources-containers/')],
    'ckad-metrics': [D('Resource management for containers', 'concepts/configuration/manage-resources-containers/')],
    'cka-sched': [D('Assigning Pods to nodes', 'concepts/scheduling-eviction/assign-pod-node/'), D('Taints and tolerations', 'concepts/scheduling-eviction/taint-and-toleration/')],
    'cka-priority': [D('Pod priority and preemption', 'concepts/scheduling-eviction/pod-priority-preemption/')],
    'cka-quota': [D('Resource quotas', 'concepts/policy/resource-quotas/')],
    'ckad-quota': [D('Resource quotas', 'concepts/policy/resource-quotas/')],
    'cka-netpol': [D('Network policies', 'concepts/services-networking/network-policies/')],
    'ckad-netpol': [D('Network policies', 'concepts/services-networking/network-policies/')],
    'cks-netpol': [D('Network policies', 'concepts/services-networking/network-policies/')],
    'cka-svc': [D('Service', 'concepts/services-networking/service/')],
    'ckad-svc': [D('Service', 'concepts/services-networking/service/')],
    'cka-ingress': [D('Ingress', 'concepts/services-networking/ingress/')],
    'ckad-ingress': [D('Ingress', 'concepts/services-networking/ingress/')],
    'cka-gateway': [D('Gateway API', 'concepts/services-networking/gateway/'), D('Gateway API project docs', 'https://gateway-api.sigs.k8s.io/')],
    'cka-dns': [D('DNS for Services and Pods', 'concepts/services-networking/dns-pod-service/')],
    'cka-pv': [D('Persistent Volumes', 'concepts/storage/persistent-volumes/')],
    'cka-sc': [D('Storage classes', 'concepts/storage/storage-classes/')],
    'cka-reclaim': [D('Persistent Volumes', 'concepts/storage/persistent-volumes/')],
    'cka-sts': [D('StatefulSets', 'concepts/workloads/controllers/statefulset/')],
    'cka-node': [D('Troubleshooting clusters', 'tasks/debug/debug-cluster/')],
    'cka-cp': [D('Troubleshooting clusters', 'tasks/debug/debug-cluster/')],
    'cka-pod': [D('Debug Pods', 'tasks/debug/debug-application/debug-pods/')],
    'ckad-debug': [D('Debug Pods', 'tasks/debug/debug-application/debug-pods/')],
    'cka-logs': [D('Logging architecture', 'concepts/cluster-administration/logging/')],
    'cka-net': [D('Debug Services', 'tasks/debug/debug-application/debug-service/')],
    'cka-drain': [D('Safely drain a node', 'tasks/administer-cluster/safely-drain-node/')],
    'ckad-job': [D('Jobs', 'concepts/workloads/controllers/job/'), D('CronJob', 'concepts/workloads/controllers/cron-jobs/')],
    'ckad-multi': [D('Pods with multiple containers', 'concepts/workloads/pods/')],
    'ckad-vol': [D('Volumes', 'concepts/storage/volumes/')],
    'ckad-image': [D('Images', 'concepts/containers/images/')],
    'ckad-bg': [D('Deployments (canary)', 'concepts/workloads/controllers/deployment/')],
    'ckad-helm': [D('Helm: using Helm', 'https://helm.sh/docs/intro/using_helm/')],
    'ckad-kust': [D('Kustomize', 'tasks/manage-kubernetes-objects/kustomization/')],
    'ckad-api': [D('Deprecated API migration guide', 'reference/using-api/deprecation-guide/')],
    'ckad-sc': [D('Configure a security context', 'tasks/configure-pod-container/security-context/')],
    'ckad-sa': [D('Service accounts', 'concepts/security/service-accounts/')],
    'ckad-imp': [D('kubectl quick reference', 'reference/kubectl/quick-reference/')],
    'ckad-jsonpath': [D('JSONPath support', 'reference/kubectl/jsonpath/')],
    'cks-rbac': [D('Using RBAC authorization', 'reference/access-authn-authz/rbac/')],
    'cks-sa': [D('Service accounts', 'concepts/security/service-accounts/')],
    'cks-cis': [D('kube-bench (Aqua Security)', 'https://github.com/aquasecurity/kube-bench')],
    'cks-upgrade': [D('Upgrading kubeadm clusters', 'tasks/administer-cluster/kubeadm/kubeadm-upgrade/')],
    'cks-seccomp': [D('Restrict syscalls with seccomp', 'tutorials/security/seccomp/')],
    'cks-apparmor': [D('Restrict a container with AppArmor', 'tutorials/security/apparmor/')],
    'cks-hostos': [D('Security concepts', 'concepts/security/')],
    'cks-psa': [D('Pod Security Admission', 'concepts/security/pod-security-admission/'), D('Pod Security Standards', 'concepts/security/pod-security-standards/')],
    'cks-priv': [D('Configure a security context', 'tasks/configure-pod-container/security-context/')],
    'cks-secrets': [D('Secrets', 'concepts/configuration/secret/')],
    'cks-etcdenc': [D('Encrypting Secret data at rest', 'tasks/administer-cluster/encrypt-data/')],
    'cks-sandbox': [D('RuntimeClass', 'concepts/containers/runtime-class/')],
    'cks-mtls': [D('Manage TLS certificates', 'tasks/tls/managing-tls-in-a-cluster/')],
    'cks-supply': [D('Images', 'concepts/containers/images/')],
    'cks-scan': [D('Trivy documentation', 'https://trivy.dev/docs/')],
    'cks-static': [D('Static Pods', 'tasks/configure-pod-container/static-pod/')],
    'cks-runtime': [D('Falco documentation', 'https://falco.org/docs/')],
    'cks-auditlog': [D('Auditing', 'tasks/debug/debug-cluster/audit/')]
  };
  // lab-specific extras (first match wins on id prefix)
  var BY_LAB = {
    's156': [D('Debug running pods: ephemeral containers', 'tasks/debug/debug-application/debug-running-pod/#ephemeral-container')],
    's157': [D('Debug running pods: copying a pod', 'tasks/debug/debug-application/debug-running-pod/#debugging-via-a-copy-of-the-pod')],
    's160': [D('Expanding Persistent Volumes Claims', 'concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims')],
    's161': [D('Immutable ConfigMaps', 'concepts/configuration/configmap/#configmap-immutable')],
    's162': [D('Projected volumes', 'concepts/storage/projected-volumes/')],
    's163': [D('Sidecar containers', 'concepts/workloads/pods/sidecar-containers/')],
    's164': [D('Network policies: ipBlock and port ranges', 'concepts/services-networking/network-policies/#targeting-a-range-of-ports')],
    's165': [D('Resize CPU and memory resources assigned to containers', 'tasks/configure-pod-container/resize-container-resources/')],
    's169': [D('Pod topology spread constraints', 'concepts/scheduling-eviction/topology-spread-constraints/')],
    's147': [D('Gateway API: traffic splitting', 'https://gateway-api.sigs.k8s.io/guides/traffic-splitting/')],
    's148': [D('Gateway API: ReferenceGrant', 'https://gateway-api.sigs.k8s.io/api-types/referencegrant/')],
    's150': [D('helm upgrade', 'https://helm.sh/docs/helm/helm_upgrade/')],
    's155': [D('Version skew policy', 'https://kubernetes.io/releases/version-skew-policy/')]
  };
  KL.sources = function (labId) {
    var C = KL.COMP, base = String(labId).replace(/^(s\d+)-.*$/, '$1'), out = [], seen = {};
    function add(l) { l.forEach(function (x) { if (!seen[x[1]]) { seen[x[1]] = 1; out.push(x); } }); }
    if (BY_LAB[base]) add(BY_LAB[base]);
    (C ? C.of(labId) : []).forEach(function (c) { if (BY_SKILL[c]) add(BY_SKILL[c]); });
    return out.slice(0, 6);
  };
  KL.sourcesAll = function () { var u = {}; Object.keys(BY_SKILL).forEach(function (k) { BY_SKILL[k].forEach(function (x) { u[x[1]] = x[0]; }); }); Object.keys(BY_LAB).forEach(function (k) { BY_LAB[k].forEach(function (x) { u[x[1]] = x[0]; }); }); return u; };
  if (typeof module !== 'undefined' && module.exports) module.exports = KL.sources;
})(typeof window !== 'undefined' ? window : globalThis);
