/* Lab design layer, kept separate from the lab specs so the 114 originals stay untouched:
   - constraint: a rule the fix must respect (checked when an assert is given)
   - trap: the tempting wrong fix, revealed in the debrief
   - why: a 3-line mental model plus one proof command
   - stage2: a hidden second fault that appears only after stage 1 passes
   - variants: same fault class, different names/values (seeded: #lab/<id>~v2)
   - ladders: ordered difficulty rungs per topic ("next rung") */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs;
  if (!Labs) return;
  function dep(name, ns, image, extra) { return 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ' + name + '\n  namespace: ' + ns + '\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: ' + name + '\n  template:\n    metadata:\n      labels:\n        app: ' + name + '\n    spec:\n      containers:\n      - name: ' + name + '\n        image: ' + image + '\n' + (extra || ''); }

  var META = {
    's01-pending-cpu': {
      constraint: { text: 'Keep `api` at 2 replicas. Fix the request, do not delete the Deployment.', assert: [{ t: 'jp', ref: 'deploy/api', ns: 'payments', path: '.spec.replicas', eq: '2' }] },
      trap: 'Adding nodes or scaling to 0 does not help: the pod asks for 64 whole CPUs and no node will ever have that. Read the scheduler message first.',
      why: { m: ['The scheduler only places a pod where the node has enough unreserved requests.', 'The Deployment copies its template into every new pod, so the typo repeats until the template changes.', 'Fix the template, not the pods; deleting a pod only recreates the same mistake.'], p: 'kubectl get deploy api -o jsonpath="{.spec.template.spec.containers[0].resources.requests}"' },
      stage2: { reveal: 'Stage 1 is fixed, but monitoring now shows a second Deployment, `cache`, that never became healthy.', apply: [dep('cache', 'payments', 'nginx:1.255')], tasks: [{ id: 'b1', title: 'Second fault: get the `cache` Deployment healthy', desc: 'A new Deployment was rolled out at the same time. Find what is wrong with it.', hints: ['`kubectl get pods -n payments` shows a different status than before.', 'ErrImagePull means the registry has no such tag.', '`kubectl set image deployment/cache cache=nginx:1.25`'], assert: [{ t: 'podsReady', ns: 'payments', sel: 'app=cache', min: 1 }] }], solution: ['kubectl set image deployment/cache cache=nginx:1.25 -n payments'] },
      variants: [{ sub: [['payments', 'billing'], ['cpu: "64"', 'cpu: "48"'], ['=64', '48']] }, { sub: [['payments', 'ledger'], ['cpu: "64"', 'cpu: "128"'], ['=64', '128']] }]
    },
    's02-imagepull': {
      constraint: { text: 'Keep 3 replicas of `web`. Roll forward; do not delete the Deployment.', assert: [{ t: 'jp', ref: 'deploy/web', ns: 'shop', path: '.spec.replicas', eq: '3' }] },
      trap: 'Deleting the failing pods changes nothing: the ReplicaSet recreates them with the same bad tag.',
      why: { m: ['ErrImagePull means the kubelet asked the registry and the tag was not there.', 'The tag lives in the pod template, so the Deployment keeps creating pods that fail the same way.', 'Changing the image creates a new ReplicaSet and a rolling update replaces the broken pods.'], p: 'kubectl get deploy web -o jsonpath="{.spec.template.spec.containers[0].image}"' },
      stage2: { reveal: 'The web tier is healthy now, but a `worker` Deployment rolled out in the same release is also stuck.', apply: [dep('worker', 'shop', 'nginx:1.25', '        env:\n        - name: QUEUE_URL\n          valueFrom:\n            configMapKeyRef:\n              name: worker-config\n              key: QUEUE_URL\n')], tasks: [{ id: 'b1', title: 'Second fault: get `worker` healthy', desc: 'Look at the pod status and describe it. This is a different error from before.', hints: ['`kubectl get pods -n shop`: CreateContainerConfigError.', '`kubectl describe pod` names the missing ConfigMap and key.', '`kubectl create configmap worker-config --from-literal=QUEUE_URL=amqp://queue:5672 -n shop`'], assert: [{ t: 'podsReady', ns: 'shop', sel: 'app=worker', min: 1 }] }], solution: ['kubectl create configmap worker-config --from-literal=QUEUE_URL=amqp://queue:5672 -n shop'] },
      variants: [{ sub: [['shop', 'retail'], ['1.255', '1.2599']] }, { sub: [['shop', 'boutique'], ['1.255', '9.99']] }]
    },
    's03-oomkilled': {
      constraint: { text: 'Do not change the image, and keep a memory limit set.', assert: [{ t: 'jp', ref: 'deploy/worker', ns: 'batch', path: '.spec.template.spec.containers[0].image', eq: 'polinux/stress' }, { t: 'jp', ref: 'deploy/worker', ns: 'batch', path: '.spec.template.spec.containers[0].resources.limits.memory' }] },
      trap: 'Removing the limit makes the symptom vanish, but one runaway pod can then take the whole node and the pod loses its predictable QoS class.',
      why: { m: ['The limit is enforced by the kernel cgroup, not by Kubernetes; going over it ends in SIGKILL (exit 137).', 'Restarting is the kubelet reacting to that exit, which is why you see CrashLoopBackOff.', 'Raise the limit above real usage, or reduce usage; the request is only a scheduling hint.'], p: 'kubectl get pod -l app=worker -o jsonpath="{.items[0].status.containerStatuses[0].lastState}"' },
      stage2: { reveal: 'The worker is stable, but a second Deployment, `indexer`, is restarting too.', apply: [dep('indexer', 'batch', 'polinux/stress', '        command: ["stress"]\n        args: ["--vm", "1", "--vm-bytes", "120M", "--vm-hang", "1"]\n        resources:\n          limits:\n            memory: 64Mi\n')], tasks: [{ id: 'b1', title: 'Second fault: stop `indexer` restarting', desc: 'Same family of problem, different Deployment. Confirm the cause before you change anything.', hints: ['`kubectl describe pod -l app=indexer` shows OOMKilled.', 'It allocates ~120M; the limit is 64Mi.', '`kubectl set resources deployment/indexer --limits=memory=256Mi -n batch`'], assert: [{ t: 'podsReady', ns: 'batch', sel: 'app=indexer', min: 1 }] }], solution: ['kubectl set resources deployment/indexer --limits=memory=256Mi -n batch'] },
      variants: [{ sub: [['worker', 'indexer-a'], ['batch', 'jobs']] }, { sub: [['worker', 'encoder'], ['batch', 'media']] }]
    },
    's04-no-endpoints': {
      constraint: { text: 'Do not relabel or restart the Deployment: other things select `app=frontend`. Fix the Service.', assert: [{ t: 'jp', ref: 'deploy/frontend', ns: 'store', path: '.spec.template.metadata.labels.app', eq: 'frontend' }] },
      trap: 'Relabelling the pods also "works", but the next rollout reverts it and anything else selecting the real label loses its pods.',
      why: { m: ['A Service never owns pods. It keeps a live list of ready pods whose labels match its selector.', 'The endpoints object is that list; empty means no pod matches, or none is Ready.', 'Compare the selector with `--show-labels`; the mismatch is usually one character.'], p: 'kubectl get endpoints frontend-svc' },
      stage2: { reveal: 'The storefront works, but the `checkout` Service added in the same release still fails.', apply: [dep('checkout', 'store', 'nginx:1.25'), 'apiVersion: v1\nkind: Service\nmetadata:\n  name: checkout-svc\n  namespace: store\nspec:\n  selector:\n    app: checkout\n  ports:\n  - port: 80\n    targetPort: 8080\n'], tasks: [{ id: 'b1', title: 'Second fault: make `checkout-svc` reachable', desc: 'This time the selector is fine. Follow the ladder: endpoints, then port.', hints: ['`kubectl get ep checkout-svc` has an address, so the selector matches.', 'nginx listens on 80, not 8080.', '`kubectl patch svc checkout-svc -n store -p \'{"spec":{"ports":[{"port":80,"targetPort":80}]}}\'`'], assert: [{ t: 'curl', ns: 'store', from: 'tester', to: 'checkout-svc:80' }] }], solution: ['kubectl patch svc checkout-svc -n store -p \'{"spec":{"ports":[{"port":80,"targetPort":80}]}}\''] },
      variants: [{ sub: [['front-end', 'shop-front'], ['frontend', 'webshop'], ['store', 'market']] }, { sub: [['front-end', 'web-ui'], ['frontend', 'portal'], ['store', 'mall']] }]
    },
    's29-svc-targetport': {
      constraint: { text: 'Keep the Service port at 80; clients already use it.', assert: [{ t: 'jp', ref: 'svc/api', ns: 'route', path: '.spec.ports[0].port', eq: '80' }] },
      trap: 'The endpoints look healthy, so it is tempting to blame the pods. The break is between the Service port and the container port.',
      why: { m: ['`port` is what clients call; `targetPort` is where the pod really listens.', 'Endpoints only prove that a pod is Ready, not that it listens on that port.', 'Read the container port (or probe the pod directly) and point targetPort at it.'], p: 'kubectl get svc api -o jsonpath="{.spec.ports[0]}"' },
      variants: [{ sub: [['8080', '9090'], ['route', 'edge']] }, { sub: [['8080', '3000'], ['route', 'mesh']] }]
    },
    's30-wrong-namespace': {
      trap: 'Running the same create again without switching namespace repeats the mistake. Set the namespace for the session or pass `-n` every time.',
      why: { m: ['Every namespaced object belongs to exactly one namespace; the default is `default` unless the context says otherwise.', 'A Deployment in the wrong namespace is healthy, which is why nothing alerts.', 'Pin the namespace in your context so each command lands where you mean it to.'], p: 'kubectl config view --minify -o jsonpath="{..namespace}"' },
      variants: [{ sub: [['portal', 'checkout'], ['staging', 'qa']] }, { sub: [['portal', 'storefront'], ['staging', 'preprod']] }]
    },
    's34-nodeselector': {
      constraint: { text: 'The pods must still be restricted by the selector. Do not remove `nodeSelector`.', assert: [{ t: 'jp', ref: 'deploy/ml', ns: 'sched', path: '.spec.template.spec.nodeSelector.gpu', eq: 'true' }] },
      trap: 'Deleting the nodeSelector makes the pods run, on nodes that do not have the hardware. The Deployment looks fixed and is wrong.',
      why: { m: ['A nodeSelector is a hard filter: no node with that label means no placement.', 'The scheduler reports it as 0/N nodes available, not as an error on the pod.', 'Either label the right node or change the selector; the label on the node is the source of truth.'], p: 'kubectl get nodes --show-labels' },
      variants: [{ sub: [['gpu', 'ssd'], ['worker2', 'worker1']] }, { sub: [['gpu', 'highmem']] }]
    },
    's38-memory-too-high': {
      constraint: { text: 'Keep a memory request on the container (do not just delete it).', assert: [{ t: 'jp', ref: 'deploy/report', ns: 'mem', path: '.spec.template.spec.containers[0].resources.requests.memory' }] },
      trap: 'Deleting the request lets the pod schedule, but it becomes BestEffort-like for scheduling and will be evicted first under pressure.',
      why: { m: ['Requests are reserved capacity; the sum on a node cannot exceed its allocatable memory.', 'A request larger than any node can ever fit means Pending forever, never a crash.', 'Size the request from observed usage, with limits above it.'], p: 'kubectl describe nodes | grep -A6 "Allocated resources"' },
      variants: [{ sub: [['report', 'digest'], ['64Gi', '96Gi']] }, { sub: [['report', 'billing'], ['64Gi', '128Gi'], ['128Mi', '256Mi']] }]
    },
    's13-pvc-pending': {
      trap: 'Waiting does not help: the claim names a StorageClass that does not exist, so no provisioner ever picks it up.',
      why: { m: ['A PVC binds only to a PV that matches class, size and access mode, or is provisioned by its class.', 'storageClassName is immutable on an existing claim, so the claim must be recreated.', '`kubectl describe pvc` events name the class it could not find.'], p: 'kubectl get storageclass' },
      variants: [{ sub: [['store-data', 'pg-data'], ['fast', 'premium']] }, { sub: [['store-data', 'media-data'], ['fast', 'gold']] }]
    },
    's11-rbac-sa': { trap: 'Binding `cluster-admin` fixes it in one line and breaks least privilege for good. Grant only the verbs and resources the deployer needs.', why: { m: ['RBAC is additive: there are no deny rules, so grant the smallest set.', 'A Role is namespaced; the binding decides who gets it.', '`auth can-i --as` tests the real result without logging in as the account.'], p: 'kubectl auth can-i create deployments --as=system:serviceaccount:ci:deployer -n ci' } },
    's12-netpol-isolate': { trap: 'A blanket deny-all policy also cuts the frontend you must keep working, and DNS if you restrict egress. Allow exactly the intended source.', why: { m: ['Pods accept all traffic until a policy selects them; after that only what is allowed gets in.', 'Policies are additive: any matching allow rule opens the path.', 'Test from a pod with and without the allowed label, never only from your terminal.'], p: 'kubectl get netpol -n app -o wide' } },
    's15-quota-limits': { trap: 'Raising the quota hides a missing requests/limits block. Compliant pods are the real fix when the quota is correct.', why: { m: ['When a quota covers cpu/memory, every pod must declare requests and limits or admission rejects it.', 'The rejection is on the ReplicaSet, so pods never appear and the Deployment looks idle.', '`describe rs` shows the forbidden message.'], p: 'kubectl describe quota -n team-a' } },
    's17-drain-cordon': { trap: 'Draining without `--ignore-daemonsets` stops immediately, and `--force` on a real node can delete bare pods that nothing recreates.', why: { m: ['Cordon only stops new pods; drain also evicts the existing ones.', 'Evictions respect PodDisruptionBudgets; deletions do not.', 'Uncordon is a separate step, so maintenance is a deliberate window.'], p: 'kubectl get nodes' } },
    's46-pdb-blocks-drain': { trap: 'Deleting the PDB makes the drain pass but removes the protection for the next one. Scale up or adjust the budget deliberately.', why: { m: ['A PDB limits voluntary disruptions, such as drain, never crashes.', 'minAvailable equal to the replica count means zero evictions are allowed.', 'Capacity first, then the drain.'], p: 'kubectl get pdb -n maint' } },
    's70-kubelet-down': { trap: 'Deleting the node object does not fix a stopped kubelet; the node re-registers once kubelet runs again and the pods are the same.', why: { m: ['NotReady means the control plane has not heard from the kubelet recently.', 'The kubelet is a systemd service on the node, outside Kubernetes.', 'Check the unit and its journal on the node itself.'], p: 'ssh worker2 "sudo systemctl status kubelet"' } },
    's85-priority-preemption': { trap: 'Raising everything to a high priority removes the point of priorities. Give only the critical workload a class.', why: { m: ['A pod with higher priority can evict lower-priority pods to get scheduled.', 'Preemption needs a priority class that is actually referenced by the pod.', 'Priority is not QoS; they are separate mechanisms.'], p: 'kubectl get priorityclass' } },
    's111-secret-volume': { trap: 'Base64 is encoding, not protection. Environment variables also leak through `describe`, crash dumps and child processes.', why: { m: ['Secrets mounted as files can be read-only with a file mode and are not inherited by child processes.', 'Env values appear in process listings and logs more often.', 'Mount with `defaultMode` and `readOnly`.'], p: 'kubectl exec deploy/billing -n vault -- ls -l /etc/db' } }
  };

  var LADDERS = [
    { name: 'Services', ids: ['s04-no-endpoints', 's29-svc-targetport', 's84-service-ladder', 's91-black-friday'] },
    { name: 'Scheduling', ids: ['s34-nodeselector', 's07-scheduling', 's35-taint-toleration', 's85-priority-preemption', 's99-noexecute-eviction'] },
    { name: 'RBAC', ids: ['s50-rolebinding-wrong-role', 's49-clusterrole-nodes', 's11-rbac-sa', 's75-rbac-least-privilege'] },
    { name: 'NetworkPolicy', ids: ['s12-netpol-isolate', 's52-netpol-namespace', 's51-netpol-egress', 's110-default-deny'] },
    { name: 'Storage', ids: ['s13-pvc-pending', 's44-static-pv', 's97-pv-retain'] },
    { name: 'Jobs', ids: ['s09-jobs', 's40-cronjob-fix', 's103-job-parallel', 's104-cronjob-policy'] },
    { name: 'Config', ids: ['s32-cm-env-missing', 's05-config-error', 's33-cm-volume', 's106-config-injection'] },
    { name: 'Rollouts', ids: ['s06-rollout-rollback', 's39-rollout-revision', 's107-rolling-strategy', 's93-release-gone-wrong'] },
    { name: 'Quota', ids: ['s48-quota-pods', 's15-quota-limits', 's47-limitrange-max', 's88-hpa-vs-quota'] },
    { name: 'Pod Security', ids: ['s53-psa-baseline', 's21-psa-restricted', 's114-psa-rollout'] },
    { name: 'Nodes', ids: ['s70-kubelet-down', 's71-kubelet-swap', 's81-disk-pressure', 's96-two-nodes-down'] },
    { name: 'Resources', ids: ['s38-memory-too-high', 's03-oomkilled', 's01-pending-cpu', 's86-qos-eviction'] }
  ];

  function walk(o, f) { if (typeof o === 'string') return f(o); if (Array.isArray(o)) return o.map(function (x) { return walk(x, f); }); if (o && typeof o === 'object') { var r = {}; Object.keys(o).forEach(function (k) { r[k] = walk(o[k], f); }); return r; } return o; }
  function subst(str, rules) { rules.forEach(function (r) { if (r[0].charAt(0) === '=') { if (str === r[0].slice(1)) str = r[1]; } else if (r[0].charAt(0) === '~') str = str.replace(new RegExp(r[0].slice(1), 'g'), r[1]); else str = str.split(r[0]).join(r[1]); }); return str; }

  Labs.meta = META; Labs.ladders = LADDERS; Labs.variantIds = {};
  Object.keys(META).forEach(function (id) { var l = Labs.byId[id], m = META[id]; if (!l) return; if (m.constraint) l.constraint = m.constraint; if (m.trap) l.trap = m.trap; if (m.why) l.why = m.why; if (m.stage2) l.stage2 = m.stage2; });
  // traps and why-notes authored later (data/traps-*.js) fill in only where a lab has none of its own
  Object.keys((root.KL && root.KL.trapsMore) || {}).forEach(function (id) { var l = Labs.byId[id], m = root.KL.trapsMore[id]; if (!l) return; if (!l.trap && !l.why) { if (m.trap) l.trap = m.trap; if (m.why) l.why = m.why; } });
  // derive variants (registered in byId only, so they never inflate the lab count)
  // hand-written variants (META) win; every other lab gets the generated ones from variants-auto.js (tools/gen-variants.cjs, each one test-validated)
  if (typeof module !== 'undefined' && typeof require === 'function') { try { require('./variants-fault2.js'); } catch (e) { /* browser build loads it with a script tag */ } }
  var AUTO = (root.KL && root.KL.autoVariants) || {}, FAULT2 = (root.KL && root.KL.fault2) || {}, VIDS = Object.keys(META).concat(Object.keys(AUTO).filter(function (k) { return !META[k] || !META[k].variants; }));
  Object.keys(FAULT2).forEach(function (k) { if (VIDS.indexOf(k) < 0) VIDS.push(k); });
  VIDS.forEach(function (id) {
    var base = Labs.byId[id], m = META[id] || {}, vlist = (m.variants || AUTO[id] || []).concat(FAULT2[id] || []); if (!base || !vlist.length) return; Labs.variantIds[id] = [id];
    vlist.forEach(function (v, i) {
      var copy = walk({ story: base.story, setup: base.setup, setupCmds: base.setupCmds, setupNs: base.setupNs, files: base.files, flags: base.flags, tasks: base.tasks, solution: base.solution, ns: base.ns, constraint: base.constraint, stage2: base.stage2 }, function (s) { return subst(s, v.sub || []); });
      if (v.edit) v.edit(copy);
      var d = Object.assign({}, base, copy, { id: id + '~v' + (i + 2), num: base.num + '·v' + (i + 2), variantOf: id, why: v.why || base.why, trap: v.trap || base.trap });
      if (v.label) d.secondFault = v.label;
      d.tasks.forEach(function (t, k) { t.id = base.tasks[k].id; });
      Labs.byId[d.id] = d; Labs.variantIds[id].push(d.id);
    });
  });
  /** deterministic variant pick: seed is any string/number (e.g. the date for the daily challenge) */
  Labs.variantFor = function (id, seed) { var ids = Labs.variantIds[id]; if (!ids) return id; var s = String(seed), h = 2166136261 >>> 0, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ids[h % ids.length]; };
  Labs.ladderOf = function (id) { id = (Labs.byId[id] && Labs.byId[id].variantOf) || id; for (var i = 0; i < LADDERS.length; i++) { var k = LADDERS[i].ids.indexOf(id); if (k >= 0) return { name: LADDERS[i].name, ids: LADDERS[i].ids, at: k }; } return null; };
})(typeof window !== 'undefined' ? window : globalThis);
