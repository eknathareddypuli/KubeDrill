/* Labs S222–S226: CKS audit-policy rule order and kubelet hardening, Helm drift, a Kustomize patch that silently matches nothing,
   and an Ingress-to-Gateway-API migration. Original scenarios from the public curriculum outline, not exam questions.
   Marked simOnly: verified in the simulator, not on a real cluster. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js');
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); o.curriculum = true; o.simOnly = true; return o; }
  function Y() { return Array.prototype.slice.call(arguments).join('\n') + '\n'; }
  function NSY(n) { return Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: ' + n); }
  Labs.register([
    // ── S222 audit policy: first matching rule wins ──
    L({ id: 's222-audit-rule-order', num: 'S222', title: 'Audit policy: the first matching rule wins', diff: 'Advanced', track: ['CKS'], domain: 'Monitoring, logging & runtime security', time: '12 min', ns: 'default',
      story: 'The draft audit policy in `/home/student/audit-policy.yaml` is meant to (1) record nothing for `get` and `list` on `events`, (2) log Secret access at `Metadata` level only, so the secret values never reach the log, (3) log `pods/exec` at `RequestResponse`, and (4) log everything else at `Metadata`. With the rules in their current order, only the last one ever applies. Reorder them; keep all four rules.',
      caution: 'The API server uses the first rule that matches a request and ignores the rest. A broad rule at the top hides every specific rule below it. Never log Secrets at Request or RequestResponse: the values would be written to disk in clear text.',
      setup: [],
      files: [{ path: '/home/student/audit-policy.yaml', content: Y('apiVersion: audit.k8s.io/v1', 'kind: Policy', 'rules:', '- level: Metadata', '- level: None', '  verbs: ["get", "list"]', '  resources:', '  - group: ""', '    resources: ["events"]', '- level: RequestResponse', '  resources:', '  - group: ""', '    resources: ["pods/exec"]', '- level: Metadata', '  resources:', '  - group: ""', '    resources: ["secrets"]') }],
      tasks: [
        T('Read the draft and find the rule that hides the others', ['`cat /home/student/audit-policy.yaml`', 'A rule with only `level` and no selectors matches every request.'], [{ t: 'file', path: '/home/student/audit-policy.yaml', msg: 'the policy file must still exist' }]),
        T('The catch-all `Metadata` rule is last', ['Move the `- level: Metadata` rule with no resources to the end of the list.'], [{ t: 'fileRe', path: '/home/student/audit-policy.yaml', re: 'resources: \\["secrets"\\][\\s\\S]*- level: Metadata\\s*$', msg: 'the rule with no selectors must come after the Secrets rule and be the final rule' }]),
        T('All four rules are still present, Secrets are not logged above Metadata', ['Keep the `None` rule for events, the `RequestResponse` rule for `pods/exec`, and the Secrets rule at `Metadata`.'], [{ t: 'fileRe', path: '/home/student/audit-policy.yaml', re: 'level: None' }, { t: 'fileRe', path: '/home/student/audit-policy.yaml', re: 'level: RequestResponse[\\s\\S]*pods/exec' }, { t: 'fileNo', path: '/home/student/audit-policy.yaml', re: 'level: (Request|RequestResponse)\\s*\\n\\s*resources:\\s*\\n\\s*- group: ""\\s*\\n\\s*resources: \\["secrets"\\]', msg: 'Secrets must stay at Metadata' }])
      ],
      solution: ['cat /home/student/audit-policy.yaml', 'cat > /home/student/audit-policy.yaml <<EOF\napiVersion: audit.k8s.io/v1\nkind: Policy\nrules:\n- level: None\n  verbs: ["get", "list"]\n  resources:\n  - group: ""\n    resources: ["events"]\n- level: RequestResponse\n  resources:\n  - group: ""\n    resources: ["pods/exec"]\n- level: Metadata\n  resources:\n  - group: ""\n    resources: ["secrets"]\n- level: Metadata\nEOF', 'cat /home/student/audit-policy.yaml'] }),

    // ── S223 kubelet hardening ──
    L({ id: 's223-kubelet-hardening', num: 'S223', title: 'Kubelet config: anonymous access, AlwaysAllow and the read-only port', diff: 'Advanced', track: ['CKS', 'CKA'], domain: 'Cluster hardening', time: '10 min', ns: 'default',
      story: 'A benchmark scan flags the kubelet configuration copy in `/home/student/kubelet-config.yaml`: anonymous requests are allowed, authorization is `AlwaysAllow`, and the unauthenticated read-only port is open. Fix those three settings and leave the rest of the file as it is. Do not change the certificate paths.',
      caution: 'With `AlwaysAllow` any caller that reaches the kubelet API may run commands in pods. Setting authorization to `Webhook` makes the kubelet ask the API server; anonymous auth must be off or the check is skipped for anonymous callers. Port 0 turns the read-only port off.',
      setup: [],
      files: [{ path: '/home/student/kubelet-config.yaml', content: Y('apiVersion: kubelet.config.k8s.io/v1beta1', 'kind: KubeletConfiguration', 'authentication:', '  anonymous:', '    enabled: true', '  webhook:', '    enabled: true', '  x509:', '    clientCAFile: /etc/kubernetes/pki/ca.crt', 'authorization:', '  mode: AlwaysAllow', 'readOnlyPort: 10255', 'cgroupDriver: systemd', 'clusterDomain: cluster.local') }],
      tasks: [
        T('Anonymous authentication is off', ['Change `anonymous.enabled` to `false`.'], [{ t: 'fileRe', path: '/home/student/kubelet-config.yaml', re: 'anonymous:\\s*\\n\\s*enabled: false' }]),
        T('Authorization mode is Webhook', ['`mode: Webhook`'], [{ t: 'fileRe', path: '/home/student/kubelet-config.yaml', re: 'mode: Webhook' }, { t: 'fileNo', path: '/home/student/kubelet-config.yaml', re: 'AlwaysAllow' }]),
        T('Read-only port is closed and nothing else changed', ['`readOnlyPort: 0`', 'The certificate path and cgroupDriver must stay.'], [{ t: 'fileRe', path: '/home/student/kubelet-config.yaml', re: 'readOnlyPort: 0' }, { t: 'fileRe', path: '/home/student/kubelet-config.yaml', re: 'clientCAFile: /etc/kubernetes/pki/ca.crt' }, { t: 'fileRe', path: '/home/student/kubelet-config.yaml', re: 'cgroupDriver: systemd' }])
      ],
      solution: ['cat /home/student/kubelet-config.yaml', 'cat > /home/student/kubelet-config.yaml <<EOF\napiVersion: kubelet.config.k8s.io/v1beta1\nkind: KubeletConfiguration\nauthentication:\n  anonymous:\n    enabled: false\n  webhook:\n    enabled: true\n  x509:\n    clientCAFile: /etc/kubernetes/pki/ca.crt\nauthorization:\n  mode: Webhook\nreadOnlyPort: 0\ncgroupDriver: systemd\nclusterDomain: cluster.local\nEOF', 'cat /home/student/kubelet-config.yaml'] }),

    // ── S224 Helm drift ──
    L({ id: 's224-helm-drift', num: 'S224', title: 'Helm release drift: someone scaled it with kubectl', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Deployment', time: '12 min', ns: 'store-h',
      story: 'Release `store` (chart `kd/web`) was installed with 2 replicas, and someone then ran `kubectl scale` to 5 during a sale. The sale is over and the team wants 3 replicas that Helm itself remembers, so the next upgrade does not undo it. Make the release say 3, keep its other settings, and get 3 pods Ready.',
      caution: 'Scaling with kubectl changes the object but not the release, so the next `helm upgrade` quietly sets it back. A plain `helm upgrade` without `--reuse-values` also drops every value you do not pass again.',
      setupCmds: ['helm repo add kd https://charts.kubedrill.example', 'helm install store kd/web -n store-h --create-namespace --set replicaCount=2 --set image.tag=1.26', 'kubectl scale deploy/store-web -n store-h --replicas=5'],
      tasks: [
        T('Compare what Helm believes with what is running', ['`helm get values store -n store-h` and `kubectl get deploy -n store-h`.'], [{ t: 'exists', ref: 'deploy/store-web', ns: 'store-h' }]),
        T('The release has a new revision that sets 3 replicas', ['`helm upgrade store kd/web -n store-h --reuse-values --set replicaCount=3`'], [{ t: 'fval', path: 'helm.rel.store-h/store.revs.1.desc', eq: 'Upgrade complete', msg: 'use `helm upgrade` so the release records the change' }, { t: 'jp', ref: 'deploy/store-web', ns: 'store-h', path: '.spec.replicas', eq: '3' }]),
        T('The image tag is still 1.26 and three pods are Ready', ['Without `--reuse-values` the tag would fall back to the chart default.'], [{ t: 'jp', ref: 'deploy/store-web', ns: 'store-h', path: '.spec.template.spec.containers[0].image', eq: 'nginx:1.26' }, { t: 'podsReady', ns: 'store-h', sel: 'app=store-web', min: 3 }])
      ],
      solution: ['helm get values store -n store-h', 'helm upgrade store kd/web -n store-h --reuse-values --set replicaCount=3', 'kubectl get pods -n store-h'] }),

    // ── S225 Kustomize patch that matches nothing ──
    L({ id: 's225-kustomize-patch-target', num: 'S225', title: 'Kustomize: the patch builds without error and changes nothing', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Deployment', time: '12 min', ns: 'kust-t',
      story: 'The overlay in `/root/app/prod` should give the Deployment 3 replicas and the label `tier: frontend`. Building the overlay prints no error, yet the output still shows 1 replica and no tier label. Fix the overlay, leave the base untouched, and apply the overlay to namespace `kust-t`.',
      caution: 'A strategic-merge patch finds its target by group, kind and name. If the name in the patch is not the name in the base, nothing matches, and Kustomize reports no error. Read the base before editing the patch.',
      setup: [NSY('kust-t')],
      files: [{ path: '/root/app/base/kustomization.yaml', content: Y('resources:', '- deployment.yaml') },
        { path: '/root/app/base/deployment.yaml', content: Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: webapp', 'spec:', '  replicas: 1', '  selector:', '    matchLabels:', '      app: webapp', '  template:', '    metadata:', '      labels:', '        app: webapp', '    spec:', '      containers:', '      - name: web', '        image: nginx:1.25') },
        { path: '/root/app/prod/kustomization.yaml', content: Y('resources:', '- ../base', 'namespace: kust-t', 'patches:', '- patch: |-', '    apiVersion: apps/v1', '    kind: Deployment', '    metadata:', '      name: web', '    spec:', '      replicas: 3', '      template:', '        metadata:', '          labels:', '            tier: frontend') }],
      tasks: [
        T('Find why the patch does nothing', ['`kubectl kustomize /root/app/prod` and `cat /root/app/base/deployment.yaml`.', 'Compare the patch `metadata.name` with the base.'], [{ t: 'fileRe', path: '/root/app/base/deployment.yaml', re: 'name: webapp' }]),
        T('The patch names the Deployment from the base', ['In the overlay change `name: web` to `name: webapp`. Do not edit the base.'], [{ t: 'fileRe', path: '/root/app/prod/kustomization.yaml', re: 'name: webapp' }, { t: 'fileRe', path: '/root/app/base/deployment.yaml', re: 'replicas: 1' }]),
        T('Apply the overlay: 3 replicas with the tier label', ['`kubectl apply -k /root/app/prod`'], [{ t: 'jp', ref: 'deploy/webapp', ns: 'kust-t', path: '.spec.replicas', eq: '3' }, { t: 'jp', ref: 'deploy/webapp', ns: 'kust-t', path: '.spec.template.metadata.labels.tier', eq: 'frontend' }, { t: 'podsReady', ns: 'kust-t', sel: 'app=webapp', min: 3 }])
      ],
      solution: ['kubectl kustomize /root/app/prod', "sed -i 's/      name: web$/      name: webapp/' /root/app/prod/kustomization.yaml", 'kubectl apply -k /root/app/prod', 'kubectl get pods -n kust-t'] }),

    // ── S226 Ingress -> Gateway API ──
    L({ id: 's226-ingress-to-gateway', num: 'S226', title: 'Migrate an Ingress to the Gateway API', diff: 'Advanced', track: ['CKA'], domain: 'Services & Networking', time: '15 min', ns: 'mig',
      story: 'Ingress `site` in `mig` sends host `site.example.com`, path prefix `/shop` to Service `shop` (port 80) and every other path to Service `landing` (port 80). Replace it with a Gateway `edge` (class `nginx`, HTTP listener on port 80) and one HTTPRoute `site` that routes the same way, then remove the Ingress.',
      caution: 'Do not delete the Ingress first: keep traffic flowing until the Gateway and route exist. The route must attach to the Gateway through `parentRefs`, and the hostname moves from the Ingress rule to the route.',
      setup: [NSY('mig'),
        Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: shop', '  namespace: mig', 'spec:', '  selector:', '    app: shop', '  ports:', '  - port: 80', '    targetPort: 80'),
        Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: landing', '  namespace: mig', 'spec:', '  selector:', '    app: landing', '  ports:', '  - port: 80', '    targetPort: 80'),
        Y('apiVersion: networking.k8s.io/v1', 'kind: Ingress', 'metadata:', '  name: site', '  namespace: mig', 'spec:', '  ingressClassName: nginx', '  rules:', '  - host: site.example.com', '    http:', '      paths:', '      - path: /shop', '        pathType: Prefix', '        backend:', '          service:', '            name: shop', '            port:', '              number: 80', '      - path: /', '        pathType: Prefix', '        backend:', '          service:', '            name: landing', '            port:', '              number: 80')],
      tasks: [
        T('Gateway `edge` exists with an HTTP listener on port 80', ['`gatewayClassName: nginx`, listener `protocol: HTTP`, `port: 80`.'], [{ t: 'jp', ref: 'gateway/edge', ns: 'mig', path: '.spec.gatewayClassName', eq: 'nginx' }, { t: 'jp', ref: 'gateway/edge', ns: 'mig', path: '.spec.listeners[0].port', eq: '80' }]),
        T('HTTPRoute `site` attaches to `edge` for the host', ['`parentRefs: [{name: edge}]` and `hostnames: ["site.example.com"]`.'], [{ t: 'jp', ref: 'httproute/site', ns: 'mig', path: '.spec.parentRefs[0].name', eq: 'edge' }, { t: 'jp', ref: 'httproute/site', ns: 'mig', path: '.spec.hostnames[0]', eq: 'site.example.com' }]),
        T('`/shop` goes to `shop` and everything else to `landing`', ['A PathPrefix match on `/shop` in the first rule, a PathPrefix `/` in the second.'], [{ t: 'jpRe', ref: 'httproute/site', ns: 'mig', path: '.spec.rules[*].matches[0].path.value', re: '^/shop /$' }, { t: 'jpRe', ref: 'httproute/site', ns: 'mig', path: '.spec.rules[*].backendRefs[0].name', re: '^shop landing$' }]),
        T('The old Ingress is gone', ['`kubectl delete ingress site -n mig` once the route is in place.'], [{ t: 'absent', ref: 'ingress/site', ns: 'mig' }])
      ],
      solution: ['kubectl get ingress site -n mig -o yaml', 'kubectl apply -f - <<EOF\napiVersion: gateway.networking.k8s.io/v1\nkind: Gateway\nmetadata:\n  name: edge\n  namespace: mig\nspec:\n  gatewayClassName: nginx\n  listeners:\n  - name: http\n    port: 80\n    protocol: HTTP\n---\napiVersion: gateway.networking.k8s.io/v1\nkind: HTTPRoute\nmetadata:\n  name: site\n  namespace: mig\nspec:\n  parentRefs:\n  - name: edge\n  hostnames: ["site.example.com"]\n  rules:\n  - matches:\n    - path:\n        type: PathPrefix\n        value: /shop\n    backendRefs:\n    - name: shop\n      port: 80\n  - matches:\n    - path:\n        type: PathPrefix\n        value: /\n    backendRefs:\n    - name: landing\n      port: 80\nEOF', 'kubectl delete ingress site -n mig'] })
,

    // ── S227 five-fault game day ──
    L({ id: 's227-gameday-five', num: 'S227', title: 'Game day: five independent faults in the bazaar', diff: 'Expert', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '35 min', ns: 'bazaar',
      story: 'Namespace `bazaar` runs five workloads and every one of them is broken in a different way. `frontend` (2 pods) must answer to the `tester` pod; Service `cart` must answer on port 80 for `tester`; `orders` (1 pod), `mailer` (1 pod) and `search` (1 pod) must be Ready. Nothing was changed on purpose. Find each cause from the evidence and fix it. Treat it as a timed drill: 35 minutes.',
      caution: 'The faults are unrelated, so fixing one does not help the others, and two of them look alike (a pod that does not run, and a pod that runs but is unreachable). Start with `kubectl get pods -n bazaar` and `kubectl get events -n bazaar`, then take them one at a time. Do not delete the namespace or the NetworkPolicy; adjust what is wrong.',
      setup: [NSY('bazaar'), Labs.y.tester('bazaar'),
        Labs.y.dep('frontend', 'bazaar', 'nginx:1.25', 2), Labs.y.svc('frontend', 'bazaar', 'frontend', 80, 80),
        Y('apiVersion: networking.k8s.io/v1', 'kind: NetworkPolicy', 'metadata:', '  name: frontend-lockdown', '  namespace: bazaar', 'spec:', '  podSelector:', '    matchLabels:', '      app: frontend', '  policyTypes: [Ingress]'),
        Labs.y.dep('cart', 'bazaar', 'nginx:1.25', 2), Labs.y.svc('cart', 'bazaar', 'carts', 80, 80),
        Labs.y.dep('orders', 'bazaar', 'nginx:1.25', 1, '        resources:\n          requests:\n            memory: 64Gi\n'),
        Labs.y.dep('mailer', 'bazaar', 'nginx:1.25', 1, '        env:\n        - name: API_KEY\n          valueFrom:\n            secretKeyRef:\n              name: mailer-secret\n              key: API_KEY\n'),
        Labs.y.dep('search', 'bazaar', 'nginx:1.255', 1)],
      tasks: [
        T('`tester` reaches `frontend:80`', ['The pods are Ready but a policy selects them and allows nothing in.', '`kubectl get netpol -n bazaar` and `kubectl describe netpol frontend-lockdown -n bazaar`.', 'Add an ingress rule from pods labelled `run=tester`.'], [{ t: 'podsReady', ns: 'bazaar', sel: 'app=frontend', min: 2 }, { t: 'curl', ns: 'bazaar', from: 'tester', to: 'frontend:80' }]),
        T('`tester` reaches `cart:80`', ['`kubectl get endpoints cart -n bazaar` is empty.', 'Compare the Service selector with the pod labels.'], [{ t: 'curl', ns: 'bazaar', from: 'tester', to: 'cart:80' }]),
        T('`orders` pod Ready', ['The pod is Pending: read the scheduling event.', 'It asks for far more memory than any node has. Request 64Mi.'], [{ t: 'podsReady', ns: 'bazaar', sel: 'app=orders', min: 1 }]),
        T('`mailer` pod Ready', ['`CreateContainerConfigError`: a Secret is missing.', 'Create `mailer-secret` with the key `API_KEY`.'], [{ t: 'podsReady', ns: 'bazaar', sel: 'app=mailer', min: 1 }]),
        T('`search` pod Ready', ['`ErrImagePull` / `ImagePullBackOff`: the tag does not exist. Use `nginx:1.25`.'], [{ t: 'podsReady', ns: 'bazaar', sel: 'app=search', min: 1 }, { t: 'exists', ref: 'netpol/frontend-lockdown', ns: 'bazaar' }])
      ],
      solution: ['kubectl get pods -n bazaar', `kubectl patch netpol frontend-lockdown -n bazaar --type=merge -p '{"spec":{"ingress":[{"from":[{"podSelector":{"matchLabels":{"run":"tester"}}}]}]}}'`, `kubectl patch svc cart -n bazaar --type=json -p '[{"op":"replace","path":"/spec/selector/app","value":"cart"}]'`, `kubectl patch deploy orders -n bazaar --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/resources/requests/memory","value":"64Mi"}]'`, 'kubectl create secret generic mailer-secret -n bazaar --from-literal=API_KEY=demo-key', 'kubectl set image deploy/search search=nginx:1.25 -n bazaar', 'kubectl get pods -n bazaar'] }),

    // ── S228 CKS game day ──
    L({ id: 's228-gameday-cks', num: 'S228', title: 'Game day (CKS): four hardening gaps in one namespace', diff: 'Expert', track: ['CKS'], domain: 'Security', time: '30 min', ns: 'ledger',
      story: 'Namespace `ledger` enforces the `restricted` Pod Security level, yet it has four gaps. Deployment `books` (1 pod) never gets a pod. The ServiceAccount `default` can administer the cluster. Pods in the namespace accept traffic from anywhere. And Deployment `audit-job` runs `nginx:latest`. Close all four: pods Ready, no admin rights for `default`, ingress denied unless allowed, and an exact image tag. Treat it as a timed drill: 30 minutes.',
      caution: 'Do not lower the Pod Security level or relabel the namespace to make `books` start: fix the pod spec. Do not delete other bindings or the namespace. Removing the admin rights of `default` must not remove the access of anything else.',
      setup: [Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: ledger', '  labels:', '    pod-security.kubernetes.io/enforce: restricted'),
        Labs.y.dep('books', 'ledger', 'nginx:1.25', 1),
        Labs.y.dep('audit-job', 'ledger', 'nginx:latest', 1, '        securityContext:\n          allowPrivilegeEscalation: false\n          capabilities:\n            drop: ["ALL"]\n          runAsNonRoot: true\n          runAsUser: 10001\n          seccompProfile:\n            type: RuntimeDefault\n'),
        Y('apiVersion: rbac.authorization.k8s.io/v1', 'kind: RoleBinding', 'metadata:', '  name: default-admin', '  namespace: ledger', 'roleRef:', '  apiGroup: rbac.authorization.k8s.io', '  kind: ClusterRole', '  name: admin', 'subjects:', '- kind: ServiceAccount', '  name: default', '  namespace: ledger')],
      tasks: [
        T('`books` pod Ready under `restricted`', ['`kubectl describe rs -n ledger` lists every violation.', 'Pod and container `securityContext`: runAsNonRoot, a numeric runAsUser, allowPrivilegeEscalation false, drop ALL, seccompProfile RuntimeDefault.'], [{ t: 'podsReady', ns: 'ledger', sel: 'app=books', min: 1 }, { t: 'jp', ref: 'ns/ledger', path: '.metadata.labels.pod-security\\.kubernetes\\.io/enforce', eq: 'restricted' }]),
        T('ServiceAccount `default` has no admin rights in `ledger`', ['`kubectl auth can-i --list --as system:serviceaccount:ledger:default -n ledger`', 'Delete the binding that grants it `admin`.'], [{ t: 'canI', as: 'system:serviceaccount:ledger:default', verb: 'create', res: 'deployments', ns: 'ledger', expect: false }]),
        T('NetworkPolicy `default-deny` denies all ingress', ['A policy with an empty podSelector and policyTypes `Ingress` and no rules.'], [{ t: 'jp', ref: 'netpol/default-deny', ns: 'ledger', path: '.spec.policyTypes[0]', eq: 'Ingress' }, { t: 'jp', ref: 'netpol/default-deny', ns: 'ledger', path: '.spec.podSelector', eq: '{}' }]),
        T('`audit-job` uses an exact tag and is Ready', ['Use `nginx:1.25`.'], [{ t: 'jp', ref: 'deploy/audit-job', ns: 'ledger', path: '.spec.template.spec.containers[0].image', eq: 'nginx:1.25' }, { t: 'podsReady', ns: 'ledger', sel: 'app=audit-job', min: 1 }])
      ],
      solution: ['kubectl describe rs -n ledger', `kubectl patch deploy books -n ledger -p '{"spec":{"template":{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":10001,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"books","securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}}}]}}}}'`, 'kubectl delete rolebinding default-admin -n ledger', 'kubectl apply -f - <<EOF\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny\n  namespace: ledger\nspec:\n  podSelector: {}\n  policyTypes: [Ingress]\nEOF', 'kubectl set image deploy/audit-job audit-job=nginx:1.25 -n ledger', 'kubectl get pods -n ledger'] })
  ]);
  if (KL.COMP) KL.COMP.add({ 's222-audit-rule-order': 'cks-auditlog', 's223-kubelet-hardening': 'cks-cis cks-hostos', 's224-helm-drift': 'ckad-helm cka-pkg', 's225-kustomize-patch-target': 'ckad-kust cka-pkg', 's226-ingress-to-gateway': 'cka-gateway cka-ingress', 's227-gameday-five': 'cka-pod cka-svc cka-netpol cka-sched ckad-debug', 's228-gameday-cks': 'cks-psa cks-rbac cks-netpol cks-supply' });
})(typeof window !== 'undefined' ? window : globalThis);
