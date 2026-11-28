/* Labs S234–S239: multi-step upgrade and recovery (an upgrade through a PodDisruptionBudget, a half-finished upgrade, a selective restore from a backup file),
   CKAD observability (probes, a sidecar's log, evidence saved before the fix), multi-node scheduling and multi-context work.
   Original scenarios from the public curriculum outline, not exam questions. Marked simOnly: verified in the simulator, not on a real cluster. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js');
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); o.curriculum = true; o.simOnly = true; return o; }
  function Y() { return Array.prototype.slice.call(arguments).join('\n') + '\n'; }
  function NSY(n) { return Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: ' + n); }
  var D = Labs.y.dep, S = Labs.y.svc;
  function VER(api, nodes) { var o = {}; Object.keys(nodes).forEach(function (n) { o[n] = nodes[n]; }); return { ver: { api: api, nodes: o } }; }
  function up(node, to) { return ["ssh " + node + " 'sudo apt-get install -y kubeadm=" + to.slice(1) + "-1.1'", "ssh " + node + " 'sudo kubeadm upgrade node'", "ssh " + node + " 'sudo apt-get install -y kubelet=" + to.slice(1) + "-1.1'", "ssh " + node + " 'sudo systemctl restart kubelet'"]; }
  var PDB3 = Y('apiVersion: policy/v1', 'kind: PodDisruptionBudget', 'metadata:', '  name: web-pdb', '  namespace: shop', 'spec:', '  minAvailable: 3', '  selector:', '    matchLabels:', '      app: web');
  var BACKUP = Y('apiVersion: v1', 'kind: ConfigMap', 'metadata:', '  name: settings', '  namespace: ledger', 'data:', '  MODE: old') + '---\n' +
    D('api', 'ledger', 'nginx:1.25', 2) + '---\n' + S('api', 'ledger', 'api', 80, 80);

  Labs.register([
    // ── S234 upgrade through a PodDisruptionBudget ──
    L({ id: 's234-upgrade-through-pdb', num: 'S234', title: 'Upgrade the cluster when a PodDisruptionBudget blocks the first drain', diff: 'Expert', track: ['CKA'], domain: 'Cluster', time: '25 min', ns: 'shop',
      story: 'The cluster runs **v1.33.0** and must reach **v1.34.0**, control plane first, then `worker1`, then `worker2`, one at a time. `web` runs three replicas and its PodDisruptionBudget `web-pdb` says `minAvailable: 3`, so no pod may ever be evicted. The first `kubectl drain` will refuse. Keep the budget (do not delete it); change it to what a rolling upgrade can live with, and finish with `web` fully Ready.',
      caution: 'On a real cluster: back up etcd first, read the release notes, upgrade one minor version at a time, and drain one node at a time. Deleting a PodDisruptionBudget to get past a blocked drain removes the protection for every later maintenance too; relax it by the smallest amount instead.',
      flags: VER('v1.33.0', { cp1: { kubelet: 'v1.33.0', pkg: {} }, worker1: { kubelet: 'v1.33.0', pkg: {} }, worker2: { kubelet: 'v1.33.0', pkg: {} } }),
      setup: [NSY('shop'), D('web', 'shop', 'nginx:1.25', 3), PDB3],
      constraint: { text: 'The PodDisruptionBudget `web-pdb` must still exist.', assert: [{ t: 'exists', ref: 'pdb/web-pdb', ns: 'shop' }] },
      tasks: [
        T('The control plane is at v1.34.0', ['`ssh cp1 \'sudo kubeadm upgrade plan\'`, then install `kubeadm=1.34.0-1.1` before `kubeadm upgrade apply v1.34.0 -y`.', 'Install kubelet and kubectl at 1.34.0 and restart the kubelet on cp1.'], [{ t: 'fval', path: 'ver.api', eq: 'v1.34.0' }, { t: 'fval', path: 'ver.nodes.cp1.kubelet', eq: 'v1.34.0' }]),
        T('`web-pdb` allows one disruption but still exists', ['`kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data` refuses: read why. `kubectl get pdb -n shop` shows ALLOWED DISRUPTIONS 0.', 'With three replicas, `minAvailable: 2` allows one eviction at a time.'], [{ t: 'jp', ref: 'pdb/web-pdb', ns: 'shop', path: '.spec.minAvailable', eq: '2' }]),
        T('`worker1` is at v1.34.0 and schedulable', ['Drain, install kubeadm, `kubeadm upgrade node`, install kubelet, restart it, then `kubectl uncordon worker1`.'], [{ t: 'fval', path: 'ver.nodes.worker1.kubelet', eq: 'v1.34.0' }, { t: 'nodeCordoned', node: 'worker1', v: false }]),
        T('`worker2` is at v1.34.0, schedulable, and `web` is fully Ready', ['Same steps for worker2, only after worker1 is back.'], [{ t: 'fval', path: 'ver.nodes.worker2.kubelet', eq: 'v1.34.0' }, { t: 'nodeCordoned', node: 'worker2', v: false }, { t: 'podsReady', ns: 'shop', sel: 'app=web', min: 3 }])
      ],
      solution: ["ssh cp1 'sudo kubeadm upgrade plan'", "ssh cp1 'sudo apt-get install -y kubeadm=1.34.0-1.1'", "ssh cp1 'sudo kubeadm upgrade apply v1.34.0 -y'", "ssh cp1 'sudo apt-get install -y kubelet=1.34.0-1.1 kubectl=1.34.0-1.1'", "ssh cp1 'sudo systemctl restart kubelet'",
        'kubectl get pdb -n shop', `kubectl patch pdb web-pdb -n shop -p '{"spec":{"minAvailable":2}}'`, 'kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data'].concat(up('worker1', 'v1.34.0'), ['kubectl uncordon worker1', 'kubectl drain worker2 --ignore-daemonsets --delete-emptydir-data'], up('worker2', 'v1.34.0'), ['kubectl uncordon worker2', 'kubectl get nodes']) }),

    // ── S235 half-finished upgrade ──
    L({ id: 's235-half-finished-upgrade', num: 'S235', title: 'Recover a half-finished upgrade left by the night shift', diff: 'Expert', track: ['CKA'], domain: 'Troubleshooting', time: '25 min', ns: 'shop',
      story: 'The control plane is already **v1.34.0**. The night shift installed the new packages on `worker1`, restarted its kubelet, and went home: the node is cordoned and NotReady, and `worker2` has not been touched (still v1.33.0). Bring `worker1` back on **v1.34.0**, then upgrade `worker2`, and finish with `web` (3 replicas) fully Ready.',
      caution: 'Recover the broken node before you touch the healthy one: draining `worker2` while `worker1` is down leaves nowhere for the pods to go. Read the kubelet log before restarting anything, and do not turn swap off permanently in the node image without agreeing it with whoever owns the node.',
      flags: { ver: { api: 'v1.34.0', nodes: { cp1: { kubelet: 'v1.34.0', pkg: {} }, worker1: { kubelet: 'v1.33.0', pkg: { kubeadm: 'v1.34.0', kubelet: 'v1.34.0' } }, worker2: { kubelet: 'v1.33.0', pkg: {} } } }, kubeletDown: { worker1: true }, swapOn: { worker1: true } },
      setup: [NSY('shop'), D('web', 'shop', 'nginx:1.25', 3)], setupCmds: ['kubectl cordon worker1'],
      tasks: [
        T('Find why the kubelet on `worker1` does not run, and turn swap off', ['`ssh worker1 \'journalctl -u kubelet\'` names swap.', '`ssh worker1 \'sudo swapoff -a\'`'], [{ t: 'flag', k: 'swapOn', sub: 'worker1', v: false, msg: 'swap on worker1 should be off' }]),
        T('`worker1` runs kubelet v1.34.0 and is schedulable again', ['`ssh worker1 \'sudo systemctl restart kubelet\'` applies the installed version, now that swap is off.', '`kubectl uncordon worker1`'], [{ t: 'flag', k: 'kubeletDown', sub: 'worker1', v: false, msg: 'kubelet on worker1 should be running' }, { t: 'fval', path: 'ver.nodes.worker1.kubelet', eq: 'v1.34.0' }, { t: 'nodeCordoned', node: 'worker1', v: false }]),
        T('`worker2` is at v1.34.0, schedulable, and `web` is fully Ready', ['Drain worker2 only now. Then kubeadm, `kubeadm upgrade node`, kubelet, restart, uncordon.'], [{ t: 'fval', path: 'ver.nodes.worker2.kubelet', eq: 'v1.34.0' }, { t: 'nodeCordoned', node: 'worker2', v: false }, { t: 'podsReady', ns: 'shop', sel: 'app=web', min: 3 }])
      ],
      solution: ["ssh worker1 'journalctl -u kubelet'", "ssh worker1 'sudo swapoff -a'", "ssh worker1 'sudo systemctl restart kubelet'", 'kubectl uncordon worker1', 'kubectl drain worker2 --ignore-daemonsets --delete-emptydir-data'].concat(up('worker2', 'v1.34.0'), ['kubectl uncordon worker2', 'kubectl get nodes']) }),

    // ── S236 selective restore ──
    L({ id: 's236-selective-restore', num: 'S236', title: 'Restore the one deleted object from last night\'s backup, not all of them', diff: 'Advanced', track: ['CKA'], domain: 'Cluster', time: '15 min', ns: 'ledger',
      story: 'Someone deleted Deployment `api` in `ledger` by mistake. Last night\'s backup is `/root/backup/ledger.yaml` (a ConfigMap `settings`, the Deployment `api` and its Service). Since the backup, the live ConfigMap `settings` was changed on purpose to `MODE: new`. Bring `api` back and make `tester` reach `api:80`, without putting the old ConfigMap value back.',
      caution: 'Applying a whole backup over a live namespace rewinds every object in it to last night, including changes people made on purpose. Restore only what is missing. `kubectl create -f` creates what is absent and refuses to overwrite what exists; `kubectl apply -f` overwrites.',
      files: [{ path: '/root/backup/ledger.yaml', content: BACKUP }],
      setup: [NSY('ledger'), Labs.y.tester('ledger'), Y('apiVersion: v1', 'kind: ConfigMap', 'metadata:', '  name: settings', '  namespace: ledger', 'data:', '  MODE: new'), S('api', 'ledger', 'api', 80, 80)],
      tasks: [
        T('`api` is Ready again with 2 replicas', ['`cat /root/backup/ledger.yaml` shows three objects; only one is missing from the cluster.', '`kubectl get all,cm -n ledger` shows what exists now.', '`kubectl create -f /root/backup/ledger.yaml` creates the missing Deployment and reports AlreadyExists for the others.'], [{ t: 'podsReady', ns: 'ledger', sel: 'app=api', min: 2 }]),
        T('The live ConfigMap `settings` still says `MODE: new`', ['Do not `apply` the whole file: it carries `MODE: old`.'], [{ t: 'jp', ref: 'cm/settings', ns: 'ledger', path: '.data.MODE', eq: 'new' }]),
        T('`tester` reaches `api:80`', ['The Service survived; it needs pods behind it.'], [{ t: 'curl', ns: 'ledger', from: 'tester', to: 'api:80' }])
      ],
      solution: ['cat /root/backup/ledger.yaml', 'kubectl get all,cm -n ledger', 'kubectl create -f /root/backup/ledger.yaml', 'kubectl rollout status deploy/api -n ledger', 'kubectl get cm settings -n ledger -o jsonpath="{.data.MODE}"'] }),

    // ── S237 CKAD observability ──
    L({ id: 's237-observability-evidence', num: 'S237', title: 'Observability: read the sidecar, keep the evidence, then fix the probes', diff: 'Advanced', track: ['CKAD'], domain: 'Observability', time: '18 min', ns: 'obs',
      story: 'Deployment `orders` in `obs` has two containers per pod, `app` (nginx) and `audit` (a sidecar that logs what it sees). Pods show `1/2` and never become Ready. First save the `audit` container\'s log to `/root/audit.log` and the namespace\'s Warning events to `/root/warn.txt` (evidence comes before the fix). Then repair the readiness probe of `app`, and add a liveness probe on the same path that checks every 10 seconds and tolerates 3 failures.',
      caution: 'Fixing first destroys the evidence: Warning events expire and a rolled pod takes its log with it. Do not remove the readiness probe to make the pods Ready; that sends traffic to pods that cannot answer.',
      setup: [NSY('obs'), Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: orders', '  namespace: obs', 'spec:', '  replicas: 2', '  selector:', '    matchLabels:', '      app: orders', '  template:', '    metadata:', '      labels:', '        app: orders', '    spec:', '      containers:', '      - name: app', '        image: nginx:1.25', '        readinessProbe:', '          httpGet:', '            path: /ready', '            port: 80', '          periodSeconds: 5', '      - name: audit', '        image: busybox:1.36', '        command: ["sh", "-c", "echo \'audit: GET / 200\'; echo \'audit: GET /ready 404\'; sleep 3600"]')],
      tasks: [
        T('`/root/audit.log` holds the `audit` container\'s log', ['`kubectl get pods -n obs` shows 1/2. With two containers you must name one: `kubectl logs <pod> -n obs -c audit`.'], [{ t: 'fileRe', path: '/root/audit.log', re: 'GET /ready 404', msg: 'the file must hold the audit container\'s log' }]),
        T('`/root/warn.txt` holds the Warning events of `obs`', ['`kubectl get events -n obs --field-selector type=Warning > /root/warn.txt`', 'Do this before the fix; the events stop once the pods are Ready.'], [{ t: 'fileRe', path: '/root/warn.txt', re: 'Warning', msg: 'the file must hold Warning events' }]),
        T('The readiness probe checks a path that answers', ['The log says `/` answers 200 and `/ready` answers 404.', 'Change `readinessProbe.httpGet.path` to `/`.'], [{ t: 'jp', ref: 'deploy/orders', ns: 'obs', path: '.spec.template.spec.containers[0].readinessProbe.httpGet.path', eq: '/' }, { t: 'podsReady', ns: 'obs', sel: 'app=orders', min: 2 }]),
        T('A liveness probe on `/`, every 10 seconds, 3 failures tolerated', ['`kubectl explain pod.spec.containers.livenessProbe`', 'httpGet path `/` port 80, periodSeconds 10, failureThreshold 3. Keep the readiness probe.'], [{ t: 'jp', ref: 'deploy/orders', ns: 'obs', path: '.spec.template.spec.containers[0].livenessProbe.httpGet.path', eq: '/' }, { t: 'jp', ref: 'deploy/orders', ns: 'obs', path: '.spec.template.spec.containers[0].livenessProbe.periodSeconds', eq: '10' }, { t: 'jp', ref: 'deploy/orders', ns: 'obs', path: '.spec.template.spec.containers[0].livenessProbe.failureThreshold', eq: '3' }, { t: 'exists', ref: 'deploy/orders', ns: 'obs' }, { t: 'jp', ref: 'deploy/orders', ns: 'obs', path: '.spec.template.spec.containers[0].readinessProbe.httpGet.path', eq: '/' }])
      ],
      solution: ['kubectl get pods -n obs', "kubectl logs $(kubectl get pods -n obs -o jsonpath='{.items[0].metadata.name}') -n obs -c audit > /root/audit.log", 'kubectl get events -n obs --field-selector type=Warning > /root/warn.txt',
        `kubectl patch deploy orders -n obs --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/"},{"op":"add","path":"/spec/template/spec/containers/0/livenessProbe","value":{"httpGet":{"path":"/","port":80},"periodSeconds":10,"failureThreshold":3}}]'`, 'kubectl rollout status deploy/orders -n obs'] }),

    // ── S238 multi-node scheduling ──
    L({ id: 's238-two-workers-four-rules', num: 'S238', title: 'Two workers, one taint, one rule too strict: get everything running', diff: 'Advanced', track: ['CKA'], domain: 'Scheduling', time: '20 min', ns: 'fleet',
      story: 'Node `worker2` carries the taint `team=data:NoSchedule` on purpose and must keep it. In `fleet`, the DaemonSet `agent` should run on both workers but is missing on `worker2`, and Deployment `web` (4 replicas) has a required pod anti-affinity by hostname, so only two pods can ever run and two stay Pending. Get `agent` onto both workers and `web` to four Ready pods, keeping the taint.',
      caution: 'A required anti-affinity of one pod per node caps the Deployment at the number of eligible nodes. Prefer a soft rule (`preferredDuringScheduling…`) or a spread constraint when the goal is only "spread out". Do not remove a taint that someone else put there to reserve a node.',
      setup: [NSY('fleet'),
        Y('apiVersion: apps/v1', 'kind: DaemonSet', 'metadata:', '  name: agent', '  namespace: fleet', 'spec:', '  selector:', '    matchLabels:', '      app: agent', '  template:', '    metadata:', '      labels:', '        app: agent', '    spec:', '      containers:', '      - name: agent', '        image: busybox:1.36', '        command: ["sleep", "3600"]'),
        D('web', 'fleet', 'nginx:1.25', 4, '', '      affinity:\n        podAntiAffinity:\n          requiredDuringSchedulingIgnoredDuringExecution:\n          - labelSelector:\n              matchLabels:\n                app: web\n            topologyKey: kubernetes.io/hostname\n      tolerations:\n      - key: team\n        operator: Equal\n        value: data\n        effect: NoSchedule\n')],
      setupCmds: ['kubectl taint nodes worker2 team=data:NoSchedule'],
      constraint: { text: 'The taint `team=data:NoSchedule` on `worker2` stays.', assert: [{ t: 'jp', ref: 'node/worker2', ns: '', path: '.spec.taints[0].key', eq: 'team' }] },
      tasks: [
        T('`agent` runs on both workers', ['`kubectl get ds agent -n fleet` shows DESIRED below the worker count: the pods skip the tainted node.', 'Add a toleration for `team=data:NoSchedule` to the DaemonSet pod template.'], [{ t: 'jp', ref: 'ds/agent', ns: 'fleet', path: '.status.numberReady', eq: '2' }]),
        T('`web` has four Ready pods', ['`kubectl describe pod` on a Pending one: "didn\'t match pod anti-affinity rules".', 'Replace the required rule with a preferred one (weight 100), or remove the rule.'], [{ t: 'podsReady', ns: 'fleet', sel: 'app=web', min: 4 }])
      ],
      solution: ['kubectl get ds agent -n fleet', 'kubectl get pods -n fleet -o wide', `kubectl patch ds agent -n fleet --type=json -p '[{"op":"add","path":"/spec/template/spec/tolerations","value":[{"key":"team","operator":"Equal","value":"data","effect":"NoSchedule"}]}]'`,
        `kubectl patch deploy web -n fleet --type=json -p '[{"op":"replace","path":"/spec/template/spec/affinity","value":{"podAntiAffinity":{"preferredDuringSchedulingIgnoredDuringExecution":[{"weight":100,"podAffinityTerm":{"labelSelector":{"matchLabels":{"app":"web"}},"topologyKey":"kubernetes.io/hostname"}}]}}}]'`, 'kubectl get pods -n fleet -o wide'] }),

    // ── S239 multi-context ──
    L({ id: 's239-add-context-then-work', num: 'S239', title: 'Add a context, then do three jobs in three clusters', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Cluster', time: '15 min', ns: 'default',
      story: 'Your kubeconfig has contexts `dev` and `staging`; the `prod` context does not exist yet. **A:** add context `prod` (cluster `kubedrill`, user `ops`, namespace `payments`). **B:** in `prod`, scale Deployment `api` to 3. **C:** in `staging`, create ConfigMap `banner` with `TEXT=freeze`. End on `dev`. Do not use `-n`: the contexts carry the namespace. (In the simulator the three "clusters" are three namespaces.)',
      caution: 'Confirm with `kubectl config current-context` before every change. The same command in the wrong context is a zero in an exam and an outage in production; ending on the least dangerous context (`dev`) limits the damage of the next stray command.',
      flags: { contexts: [{ name: 'dev', cluster: 'kubedrill', user: 'dev', ns: 'dev' }, { name: 'staging', cluster: 'kubedrill', user: 'dev', ns: 'staging' }], current: 'dev' },
      setup: [NSY('dev'), NSY('staging'), NSY('payments'), D('api', 'dev', 'nginx:1.25', 1), D('api', 'staging', 'nginx:1.25', 1), D('api', 'payments', 'nginx:1.25', 1)],
      constraint: { text: 'Nothing else changes: `api` in `dev` and `staging` stays at 1 replica.', assert: [{ t: 'jp', ref: 'deployment/api', ns: 'dev', path: '.spec.replicas', eq: '1' }, { t: 'jp', ref: 'deployment/api', ns: 'staging', path: '.spec.replicas', eq: '1' }] },
      tasks: [
        T('Context `prod` exists with namespace `payments`', ['`kubectl config set-context prod --cluster=kubedrill --user=ops --namespace=payments`', '`kubectl config get-contexts` to check.'], [{ t: 'ctx', name: 'prod', ns: 'payments' }]),
        T('In `prod`, `api` has 3 replicas', ['`kubectl config use-context prod`, then `kubectl scale deploy api --replicas=3`.'], [{ t: 'jp', ref: 'deployment/api', ns: 'payments', path: '.spec.replicas', eq: '3' }]),
        T('In `staging`, ConfigMap `banner` has `TEXT=freeze`', ['`kubectl config use-context staging`', '`kubectl create configmap banner --from-literal=TEXT=freeze`'], [{ t: 'jp', ref: 'configmap/banner', ns: 'staging', path: '.data.TEXT', eq: 'freeze' }]),
        T('You end on `dev`', ['`kubectl config use-context dev`'], [{ t: 'ctx', current: 'dev' }])
      ],
      solution: ['kubectl config get-contexts', 'kubectl config set-context prod --cluster=kubedrill --user=ops --namespace=payments', 'kubectl config use-context prod', 'kubectl config current-context', 'kubectl scale deploy api --replicas=3', 'kubectl config use-context staging', 'kubectl create configmap banner --from-literal=TEXT=freeze', 'kubectl config use-context dev', 'kubectl config current-context'] })
  ]);
  if (KL.COMP) KL.COMP.add({ 's234-upgrade-through-pdb': 'cka-upgrade cka-kubeadm cka-drain', 's235-half-finished-upgrade': 'cka-upgrade cka-kubeadm cka-node', 's236-selective-restore': 'cka-etcd cka-pod', 's237-observability-evidence': 'cka-logs ckad-probe ckad-debug', 's238-two-workers-four-rules': 'cka-sched cka-pod', 's239-add-context-then-work': 'cka-ctx' });
})(typeof window !== 'undefined' ? window : globalThis);
