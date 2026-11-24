/* Labs S217–S219: NetworkPolicy peers (AND vs OR in one list item), a Deployment whose ServiceAccount does not exist (and what the new account may read),
   and runAsNonRoot refusing to start a root image. Original scenarios from the public curriculum outline, not exam questions.
   Marked simOnly: verified in the simulator, not on a real cluster. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js');
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); o.curriculum = true; o.simOnly = true; return o; }
  function Y() { return Array.prototype.slice.call(arguments).join('\n') + '\n'; }
  function NSY(n, lbl) { return Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: ' + n).replace(/\n$/, '') + (lbl ? '\n  labels:\n    ' + lbl : '') + '\n'; }
  function POD(ns, name, labels) { return Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: ' + name, '  namespace: ' + ns, '  labels:', '    ' + labels, 'spec:', '  containers:', '  - name: c', '    image: busybox:1.36', '    command: ["sleep", "3600"]'); }
  Labs.register([
    // ── S217 AND vs OR ──
    L({ id: 's217-netpol-and-or', num: 'S217', title: 'NetworkPolicy: two selectors in one peer, not two peers', diff: 'Advanced', track: ['CKA', 'CKAD', 'CKS'], domain: 'Services & Networking', time: '15 min', ns: 'vault',
      story: 'Only the backup job may read the `store` Service in `vault`: a pod labelled `role=backup` that runs in the `ops` namespace. The policy `store-in` was written for that, yet `scratch` (also in `ops`, role `scratch`) and `rogue` (in `vault` itself, role `backup`) can both reach the store. Change the policy so that only `backup` in `ops` gets through.',
      caution: 'Do not "fix" this by deleting the policy or by adding a deny-all next to it: policies add up, so a second policy cannot take away what the first one allows. Look at where the dashes are.',
      setup: [NSY('vault'), NSY('ops', 'team: ops'),
        Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: store', '  namespace: vault', 'spec:', '  replicas: 1', '  selector:', '    matchLabels:', '      app: store', '  template:', '    metadata:', '      labels:', '        app: store', '    spec:', '      containers:', '      - name: store', '        image: nginx:1.25'),
        Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: store', '  namespace: vault', 'spec:', '  selector:', '    app: store', '  ports:', '  - port: 80', '    targetPort: 80'),
        POD('ops', 'backup', 'role: backup'), POD('ops', 'scratch', 'role: scratch'), POD('vault', 'rogue', 'role: backup'),
        Y('apiVersion: networking.k8s.io/v1', 'kind: NetworkPolicy', 'metadata:', '  name: store-in', '  namespace: vault', 'spec:', '  podSelector:', '    matchLabels:', '      app: store', '  policyTypes: [Ingress]', '  ingress:', '  - from:', '    - namespaceSelector:', '        matchLabels:', '          team: ops', '    - podSelector:', '        matchLabels:', '          role: backup', '    ports:', '    - protocol: TCP', '      port: 80')],
      tasks: [
        T('Read the policy and test from the three pods', ['`kubectl get netpol store-in -n vault -o yaml`', '`kubectl exec -n ops scratch -- wget -qO- -T 2 store.vault` shows the over-allow.'], [{ t: 'exists', ref: 'networkpolicy/store-in', ns: 'vault' }]),
        T('`backup` in `ops` still reaches the store', ['The `from` entry must still select namespace `team=ops`.'], [{ t: 'curl', ns: 'ops', from: 'backup', to: 'store.vault:80' }]),
        T('`scratch` in `ops` is refused', ['A namespaceSelector alone admits every pod of that namespace. Put the podSelector in the same list item.'], [{ t: 'curl', ns: 'ops', from: 'scratch', to: 'store.vault:80', ok: false }]),
        T('`rogue` in `vault` is refused', ['A separate `- podSelector` item admits pods with that label from the policy\'s own namespace.'], [{ t: 'curl', ns: 'vault', from: 'rogue', to: 'store.vault:80', ok: false }])
      ],
      solution: ['kubectl get netpol store-in -n vault -o yaml', 'kubectl apply -f - <<EOF\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: store-in\n  namespace: vault\nspec:\n  podSelector:\n    matchLabels:\n      app: store\n  policyTypes: [Ingress]\n  ingress:\n  - from:\n    - namespaceSelector:\n        matchLabels:\n          team: ops\n      podSelector:\n        matchLabels:\n          role: backup\n    ports:\n    - protocol: TCP\n      port: 80\nEOF', 'kubectl exec -n ops scratch -- wget -qO- -T 2 store.vault'] }),

    // ── S218 missing ServiceAccount ──
    L({ id: 's218-missing-sa-view', num: 'S218', title: 'Deployment has no pods: its ServiceAccount does not exist', diff: 'Intermediate', track: ['CKAD', 'CKA'], domain: 'Security', time: '12 min', ns: 'metrics',
      story: 'Deployment `reporter` in `metrics` wants two replicas but has no pods. The ReplicaSet events say it cannot look up a service account. Create the account the Deployment names, let it read pods and nothing more in this namespace using the built-in `view` ClusterRole, and get both pods running.',
      caution: 'Do not remove `serviceAccountName` from the Deployment to get pods quickly: the pods would run as `default`, which may hold other permissions. Bind `view` with a RoleBinding in this namespace, not a ClusterRoleBinding.',
      setup: [NSY('metrics'), Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: reporter', '  namespace: metrics', 'spec:', '  replicas: 2', '  selector:', '    matchLabels:', '      app: reporter', '  template:', '    metadata:', '      labels:', '        app: reporter', '    spec:', '      serviceAccountName: metrics-reader', '      containers:', '      - name: reporter', '        image: nginx:1.25')],
      tasks: [
        T('Find the error and the account name', ['`kubectl get rs -n metrics` then `kubectl describe rs -n metrics`, or `kubectl get events -n metrics`.'], [{ t: 'exists', ref: 'deploy/reporter', ns: 'metrics' }]),
        T('ServiceAccount `metrics-reader` exists', ['`kubectl create serviceaccount metrics-reader -n metrics`'], [{ t: 'exists', ref: 'sa/metrics-reader', ns: 'metrics' }]),
        T('It may read pods in `metrics`, but not delete them or read pods elsewhere', ['`kubectl create rolebinding metrics-view -n metrics --clusterrole=view --serviceaccount=metrics:metrics-reader`', '`kubectl auth can-i list pods -n metrics --as system:serviceaccount:metrics:metrics-reader`'], [{ t: 'canI', as: 'system:serviceaccount:metrics:metrics-reader', verb: 'list', res: 'pods', ns: 'metrics' }, { t: 'canI', as: 'system:serviceaccount:metrics:metrics-reader', verb: 'delete', res: 'pods', ns: 'metrics', expect: false }, { t: 'canI', as: 'system:serviceaccount:metrics:metrics-reader', verb: 'list', res: 'pods', ns: 'default', expect: false }]),
        T('Both pods are running', ['The ReplicaSet retries by itself once the account exists.'], [{ t: 'podsReady', ns: 'metrics', sel: 'app=reporter', min: 2 }])
      ],
      solution: ['kubectl get events -n metrics', 'kubectl create serviceaccount metrics-reader -n metrics', 'kubectl create rolebinding metrics-view -n metrics --clusterrole=view --serviceaccount=metrics:metrics-reader', 'kubectl get pods -n metrics'] }),

    // ── S219 runAsNonRoot ──
    L({ id: 's219-runasnonroot', num: 'S219', title: 'Pod refuses to start: runAsNonRoot with an image that runs as root', diff: 'Intermediate', track: ['CKAD', 'CKS'], domain: 'Security', time: '10 min', ns: 'hardened',
      story: 'The `web` Deployment in `hardened` was given `runAsNonRoot: true` by the platform team and now its pod sits in `CreateContainerConfigError`. The policy must stay: the container must not run as UID 0. Make the pod start with a numeric non-root user and drop all Linux capabilities.',
      caution: 'Do not flip `runAsNonRoot` to false or delete the securityContext: that is the control the platform team asked for. Kubernetes cannot verify a named user, so give a numeric `runAsUser`.',
      setup: [NSY('hardened'), Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: web', '  namespace: hardened', 'spec:', '  replicas: 1', '  selector:', '    matchLabels:', '      app: web', '  template:', '    metadata:', '      labels:', '        app: web', '    spec:', '      securityContext:', '        runAsNonRoot: true', '      containers:', '      - name: web', '        image: nginx:1.25')],
      tasks: [
        T('Read the error', ['`kubectl get pods -n hardened`, then `kubectl describe pod -n hardened -l app=web` or `kubectl get events -n hardened`.'], [{ t: 'exists', ref: 'deploy/web', ns: 'hardened' }]),
        T('Pod spec keeps `runAsNonRoot: true` and sets a numeric `runAsUser`', ['`kubectl patch deploy web -n hardened -p \'{"spec":{"template":{"spec":{"securityContext":{"runAsUser":10001}}}}}\'`'], [{ t: 'jp', ref: 'deploy/web', ns: 'hardened', path: '.spec.template.spec.securityContext.runAsNonRoot', eq: 'true' }, { t: 'jpRe', ref: 'deploy/web', ns: 'hardened', path: '.spec.template.spec.securityContext.runAsUser', re: '^[1-9][0-9]*$' }]),
        T('Container drops all capabilities and the pod is Ready', ['Container securityContext: `capabilities: {drop: ["ALL"]}`. Patch the container by name.'], [{ t: 'jpRe', ref: 'deploy/web', ns: 'hardened', path: '.spec.template.spec.containers[*].securityContext.capabilities.drop', re: 'ALL' }, { t: 'podsReady', ns: 'hardened', sel: 'app=web', min: 1 }])
      ],
      solution: ['kubectl get events -n hardened', `kubectl patch deploy web -n hardened -p '{"spec":{"template":{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":10001},"containers":[{"name":"web","securityContext":{"capabilities":{"drop":["ALL"]}}}]}}}}'`, 'kubectl get pods -n hardened'] })
,

    // ── S220 Ingress: wrong pathType and backend port ──
    L({ id: 's220-ingress-pathtype-port', num: 'S220', title: 'Ingress: /api/v1 returns 404 and / returns 503', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Services & Networking', time: '12 min', ns: 'shop',
      story: 'Ingress `store` in `shop` (class `nginx`, host `store.local`) is meant to send `/api` and everything below it (`/api/v1/orders`) to Service `api` on port 80, and every other path to Service `web` on port 80. Today `/api/v1/orders` answers 404 and `/` answers 503. Fix the Ingress in place; do not change the Services.',
      caution: 'Do not widen the match with a wildcard host or a catch-all path to hide the 404: only `/api` and `/` should be routed. Check the Services with `kubectl get svc` before choosing a backend port.',
      setup: [NSY('shop'),
        Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: web', '  namespace: shop', 'spec:', '  replicas: 1', '  selector:', '    matchLabels:', '      app: web', '  template:', '    metadata:', '      labels:', '        app: web', '    spec:', '      containers:', '      - name: web', '        image: nginx:1.25'),
        Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: web', '  namespace: shop', 'spec:', '  selector:', '    app: web', '  ports:', '  - port: 80', '    targetPort: 80'),
        Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: api', '  namespace: shop', 'spec:', '  replicas: 1', '  selector:', '    matchLabels:', '      app: api', '  template:', '    metadata:', '      labels:', '        app: api', '    spec:', '      containers:', '      - name: api', '        image: nginx:1.25'),
        Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: api', '  namespace: shop', 'spec:', '  selector:', '    app: api', '  ports:', '  - port: 80', '    targetPort: 80'),
        Y('apiVersion: networking.k8s.io/v1', 'kind: Ingress', 'metadata:', '  name: store', '  namespace: shop', 'spec:', '  ingressClassName: nginx', '  rules:', '  - host: store.local', '    http:', '      paths:', '      - path: /api', '        pathType: Exact', '        backend:', '          service:', '            name: api', '            port:', '              number: 80', '      - path: /', '        pathType: Prefix', '        backend:', '          service:', '            name: web', '            port:', '              number: 8080')],
      tasks: [
        T('Compare the Ingress with the Services', ['`kubectl get ingress store -n shop -o yaml` and `kubectl get svc -n shop`.', 'Exact matches only the path `/api` itself.'], [{ t: 'exists', ref: 'ingress/store', ns: 'shop' }]),
        T('`/api` matches by prefix', ['`pathType: Prefix` matches the path and everything below it, split on `/`.'], [{ t: 'jpRe', ref: 'ingress/store', ns: 'shop', path: '.spec.rules[0].http.paths[*].pathType', re: '^Prefix Prefix$' }]),
        T('Both backends use port 80', ['The Service `web` exposes port 80, not 8080.', '`kubectl edit ingress store -n shop` or apply a corrected manifest.'], [{ t: 'jpRe', ref: 'ingress/store', ns: 'shop', path: '.spec.rules[0].http.paths[*].backend.service.port.number', re: '^80 80$' }, { t: 'jp', ref: 'ingress/store', ns: 'shop', path: '.spec.ingressClassName', eq: 'nginx' }])
      ],
      solution: ['kubectl get ingress store -n shop -o yaml', 'kubectl apply -f - <<EOF\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: store\n  namespace: shop\nspec:\n  ingressClassName: nginx\n  rules:\n  - host: store.local\n    http:\n      paths:\n      - path: /api\n        pathType: Prefix\n        backend:\n          service:\n            name: api\n            port:\n              number: 80\n      - path: /\n        pathType: Prefix\n        backend:\n          service:\n            name: web\n            port:\n              number: 80\nEOF'] }),

    // ── S221 JSONPath / custom-columns report ──
    L({ id: 's221-inventory-report', num: 'S221', title: 'Inventory report: custom columns, sorted output and a jsonpath value', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '12 min', ns: 'inv',
      story: 'The audit team wants three small files in `/home/student` for the pods in namespace `inv`. `images.txt`: a table with the columns NAME and IMAGE, one row per pod. `oldest.txt`: the pod names, oldest first, one per line, as `pod/<name>`. `node.txt`: only the name of the node that runs pod `api`, with nothing else in the file. No extra tools: use kubectl output options.',
      caution: 'Do not copy values by hand. Names and images change; the output options keep the files correct. A jsonpath for one pod needs the pod name in the command, not a loop.',
      setup: [NSY('inv'),
        Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: api', '  namespace: inv', 'spec:', '  containers:', '  - name: c', '    image: nginx:1.25'),
        Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: worker', '  namespace: inv', 'spec:', '  containers:', '  - name: c', '    image: busybox:1.36', '    command: ["sleep", "3600"]'),
        Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: cache', '  namespace: inv', 'spec:', '  containers:', '  - name: c', '    image: redis:7')],
      tasks: [
        T('`images.txt` has NAME and IMAGE columns', ['`-o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image`', 'Redirect with `>` into `/home/student/images.txt`.'], [{ t: 'fileRe', path: '/home/student/images.txt', re: 'NAME\\s+IMAGE' }, { t: 'fileRe', path: '/home/student/images.txt', re: 'api\\s+nginx:1\\.25' }, { t: 'fileRe', path: '/home/student/images.txt', re: 'cache\\s+redis:7' }]),
        T('`oldest.txt` lists pods oldest first', ['`--sort-by=.metadata.creationTimestamp` and `-o name`.'], [{ t: 'fileRe', path: '/home/student/oldest.txt', re: 'pod/api' }, { t: 'fileRe', path: '/home/student/oldest.txt', re: 'pod/worker' }, { t: 'fileRe', path: '/home/student/oldest.txt', re: 'pod/cache' }, { t: 'fileRe', path: '/home/student/oldest.txt', re: '^pod/[a-z]+\\npod/[a-z]+\\npod/[a-z]+\\s*$' }]),
        T('`node.txt` holds only the node of `api`', ['`kubectl get pod api -n inv -o jsonpath=\'{.spec.nodeName}\'`'], [{ t: 'fileRe', path: '/home/student/node.txt', re: '^(worker1|worker2)$' }])
      ],
      solution: ['kubectl get pods -n inv -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image > images.txt', 'kubectl get pods -n inv --sort-by=.metadata.creationTimestamp -o name > oldest.txt', `kubectl get pod api -n inv -o jsonpath='{.spec.nodeName}' > node.txt`, 'cat node.txt'] })
  ]);
  if (KL.COMP) KL.COMP.add({ 's217-netpol-and-or': 'ckad-netpol cka-netpol cks-netpol', 's218-missing-sa-view': 'ckad-sa cka-rbac cks-rbac', 's219-runasnonroot': 'cks-psa cks-priv ckad-sc', 's220-ingress-pathtype-port': 'cka-ingress ckad-ingress cka-svc', 's221-inventory-report': 'ckad-jsonpath exam-docs' });
})(typeof window !== 'undefined' ? window : globalThis);
