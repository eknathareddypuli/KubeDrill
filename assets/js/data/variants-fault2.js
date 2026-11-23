/* Second-fault variants for the 12 most-used labs. The auto-generated variants only rename the namespace and objects; these change the
   FAULT itself (a different cause, a different symptom, often a different fix), so a learner who memorised "set image" or "patch the selector"
   still has to read the evidence. Each is hand-written and validated like any other lab (fail before, pass after) by tests/labs.test.js.
   Format: KL.fault2[labId] = [{ label, edit(copy), trap?, why? }]; `edit` rewrites the lab copy (story, setup, setupCmds, tasks, solution). */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, F = KL.fault2 = KL.fault2 || {};
  function Y() { return Array.prototype.slice.call(arguments).join('\n') + '\n'; }
  function rep(arr, from, to) { var hit = false; for (var i = 0; i < arr.length; i++) { if (typeof arr[i] === 'string' && arr[i].indexOf(from) >= 0) { arr[i] = arr[i].split(from).join(to); hit = true; } } if (!hit) throw new Error('fault2: pattern not found: ' + from.slice(0, 60)); }
  function task(copy, i, title, hints, assert) { var t = copy.tasks[i]; if (title) t.title = title; if (hints) t.hints = hints; if (assert) t.assert = assert; }

  F['s01-pending-cpu'] = [{ label: 'Pending for a different reason: a nodeSelector that no node matches',
    edit: function (c) {
      c.story = 'The `api` Deployment in namespace `payments` was rolled out last night. Pods never start, and its resource requests look perfectly reasonable. Find out why and get 2 healthy replicas running.';
      rep(c.setup, 'cpu: "64"', 'cpu: 100m'); rep(c.setup, '      containers:\n      - name: api', '      nodeSelector:\n        disktype: nvme\n      containers:\n      - name: api');
      task(c, 0, 'Find why the pods are Pending', ['`kubectl describe pod -n payments -l app=api`: read the last event.', 'The scheduler lists, per node, why it was rejected. Look for the word "selector".'], [{ t: 'jpRe', ref: 'deploy/api', ns: 'payments', path: '.spec.template.spec', re: '^(?![\\s\\S]*nvme)', msg: 'the pod template must not require a `disktype=nvme` node' }]);
      c.solution = ['kubectl describe pod -n payments -l app=api | grep -A3 Events', `kubectl patch deployment api -n payments --type=json -p '[{"op":"remove","path":"/spec/template/spec/nodeSelector"}]'`, 'kubectl rollout status deployment/api -n payments'];
    }, trap: 'Lowering the CPU request or adding nodes changes nothing: the request is fine, and the pods ask for a node label (`disktype=nvme`) that no node carries. Read the scheduler message before touching resources.',
    why: { m: ['`nodeSelector` is a hard requirement: if no node carries the label, the pod stays Pending forever.', 'The event says how many nodes did not match the selector; it is a different message from "Insufficient cpu".', 'Fix the template (remove or correct the selector), not the pods: the Deployment recreates them from the template.'] } }];

  F['s02-imagepull'] = [{ label: 'The tag exists, but the registry is private and no pull secret is used',
    edit: function (c) {
      c.story = 'The `web` Deployment in `shop` now pulls its image from the team registry, `private.registry.example/shop/web:2.1`. The tag exists, yet no pod starts. A pull secret named `regcred` was created in the namespace by the platform team. Get 3 Ready pods.';
      rep(c.setup, 'image: nginx:1.255', 'image: private.registry.example/shop/web:2.1');
      c.setup.push(Y('apiVersion: v1', 'kind: Secret', 'metadata:', '  name: regcred', '  namespace: shop', 'type: kubernetes.io/dockerconfigjson', 'data:', '  .dockerconfigjson: e30='));
      task(c, 0, 'Find why the pull is refused', ['`kubectl describe pod -n shop -l app=web`: read the Failed event.', '"no basic auth credentials" means the registry wants credentials the pod did not send.'], [{ t: 'jp', ref: 'deploy/web', ns: 'shop', path: '.spec.template.spec.imagePullSecrets[0].name', eq: 'regcred' }]);
      task(c, 1, 'Fix it: 3 Ready pods from the private registry image', null, [{ t: 'podsReady', ns: 'shop', sel: 'app=web', min: 3 }, { t: 'jp', ref: 'deploy/web', ns: 'shop', path: '.spec.template.spec.containers[0].image', has: 'private.registry.example/shop/web' }]);
      c.solution = ['kubectl describe pod -n shop -l app=web', `kubectl patch deployment web -n shop -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"regcred"}]}}}}'`, 'kubectl rollout status deployment/web -n shop'];
    }, trap: 'Changing the image to a public one makes the pods start but ships the wrong software. The image is right; the pod template only lacks `imagePullSecrets`.',
    why: { m: ['A private registry needs credentials: the kubelet sends the pull secret named in `imagePullSecrets`.', 'The Secret existing in the namespace is not enough; the pod (or its ServiceAccount) must reference it.', 'The message says authorization failed, not "manifest unknown": that is how you tell it from a bad tag.'] } }];

  F['s03-oomkilled'] = [{ label: 'The memory use comes from an environment variable, not from the arguments',
    edit: function (c) {
      c.story = 'The `worker` Deployment limits memory to 100 MiB, and the application sizes its in-memory cache from the environment variable `MEM_MB` (currently `300`). Pods restart forever (exit code 137). Diagnose and fix without changing the image.';
      rep(c.setup, 'args: ["--vm", "1", "--vm-bytes", "150M", "--vm-hang", "1"]', 'args: ["--vm", "1", "--vm-bytes", "50M", "--vm-hang", "1"]\n        env:\n        - name: MEM_MB\n          value: "300"');
      task(c, 0, 'Confirm the pods were OOMKilled', null, [{ t: 'jp', ref: 'deploy/worker', ns: 'batch', path: '.spec.template.spec.containers[0].env[0].value', ne: '300' }, { t: 'podsReady', ns: 'batch', sel: 'app=worker', min: 2 }]);
      task(c, 1, 'A memory limit is still set after the fix', ['A limit stays in place: lowering `MEM_MB` below it is a valid fix, as is raising the limit above real use.'], [{ t: 'jpRe', ref: 'deploy/worker', ns: 'batch', path: '.spec.template.spec.containers[0].resources.limits.memory', re: '^\\d+(Mi|Gi)$', msg: 'keep a memory limit set' }]);
      c.solution = ['kubectl describe pod -n batch -l app=worker | grep -A4 "Last State"', 'kubectl set env deployment/worker MEM_MB=64 -n batch', 'kubectl rollout status deployment/worker -n batch'];
    }, trap: 'Raising the limit hides that the application sizes its cache from `MEM_MB`: the next traffic increase hits the new limit. Fix the setting that drives the usage, or size the limit from real use.',
    why: { m: ['Exit code 137 with reason OOMKilled means the kernel killed the container for exceeding its cgroup limit.', 'Usage can come from arguments, from environment variables or from the application itself: read the spec, not only the limit.', 'Any fix that brings usage below the limit works; removing the limit does not.'] } }];

  F['s04-no-endpoints'] = [{ label: 'The selector is right; the pods are never Ready (a bad readiness probe)',
    edit: function (c) {
      c.story = 'Users get "connection refused" from `frontend-svc`. The Service selector matches the pods and the Deployment shows pods Running, yet the Service has no endpoints. A `tester` pod is available to curl from inside the cluster.';
      rep(c.setup, 'selector:\n    app: front-end', 'selector:\n    app: frontend');
      rep(c.setup, '        image: nginx:1.25\n', '        image: nginx:1.25\n        readinessProbe:\n          httpGet:\n            path: /healthz\n            port: 80\n');
      task(c, 0, 'Show that the Service has no ready endpoints', ['`kubectl get pods -n store`: look at the READY column.', '`kubectl describe pod` shows the probe failure.'], [{ t: 'jp', ref: 'deploy/frontend', ns: 'store', path: '.spec.template.spec.containers[0].readinessProbe.httpGet.path', ne: '/healthz' }]);
      task(c, 1, 'Fix the probe → ≥2 endpoints', null, [{ t: 'endpoints', svc: 'frontend-svc', ns: 'store', min: 2 }]);
      c.solution = ['kubectl describe pod -n store -l app=frontend | grep -i readiness', `kubectl patch deployment frontend -n store --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/"}]'`, 'kubectl get ep frontend-svc', 'kubectl exec tester -- wget -qO- frontend-svc'];
    }, trap: 'Rewriting the Service selector or recreating the Service changes nothing: it already matches. A Service lists only Ready pods, and the readiness probe asks nginx for a path it does not serve.',
    why: { m: ['Endpoints contain only pods that are Ready, so a failing readiness probe empties them even when the selector is perfect.', 'READY 0/1 with STATUS Running is the tell: the container runs but the probe fails.', 'The event says the probe got a 404 for /healthz: fix the path in the template.'] } }];

  F['s05-config-error'] = [{ label: 'The ConfigMap exists but the key the pod asks for is missing',
    edit: function (c) {
      c.story = 'The `app` Deployment reads `LOG_LEVEL` from ConfigMap `app-config`. The ConfigMap exists, but the pods are stuck anyway. Find out why, make the value `debug`, and verify the pods read it.';
      c.setup.push(Y('apiVersion: v1', 'kind: ConfigMap', 'metadata:', '  name: app-config', '  namespace: inventory', 'data:', '  LOG_LVL: debug', '  REGION: eu'));
      c.solution = ['kubectl describe pod -n inventory -l app=app | grep -i key', `kubectl patch configmap app-config -n inventory -p '{"data":{"LOG_LEVEL":"debug"}}'`, 'kubectl rollout restart deployment/app -n inventory', 'kubectl exec deploy/app -n inventory -- printenv LOG_LEVEL'];
      task(c, 0, 'Add the missing key `LOG_LEVEL=debug` to the existing ConfigMap', ['The event names the key: `couldn\'t find key LOG_LEVEL in ConfigMap`.', 'Compare it with `kubectl get cm app-config -o yaml`: the existing key is spelled differently.']);
    }, trap: 'Creating a new ConfigMap with `kubectl create` fails because one already exists, and deleting it loses `REGION`. Patch the key in.',
    why: { m: ['A configMapKeyRef needs both the object and the key; a missing key gives CreateContainerConfigError just like a missing object.', 'The event text tells which of the two is missing: read it before creating anything.', 'Env vars are read at container start, so existing pods need a restart after the ConfigMap changes.'] } }];

  F['s29-svc-targetport'] = [{ label: 'The Service port is wrong, not the targetPort',
    edit: function (c) {
      c.story = 'Service `api` has endpoints and forwards to the right container port, yet `tester` cannot reach it on port 80: it must be listening on a different port. The nginx containers listen on 80.';
      c.setup.forEach(function (s, i) { if (/kind: Service/.test(s)) c.setup[i] = s.replace('- port: 80\n    targetPort: 8080', '- port: 8080\n    targetPort: 80'); });
      task(c, 0, 'Find the wrong port', ['`kubectl get svc api -n route`: the PORT(S) column is the port clients use.'], [{ t: 'jp', ref: 'svc/api', ns: 'route', path: '.spec.ports[0].port', ne: '8080' }]);
    }, trap: 'Changing `targetPort` breaks the working half: the containers do listen on 80. The Service listens on 8080, and clients were told port 80.',
    why: { m: ['`port` is where the Service listens; `targetPort` is where the container listens. They are two different numbers.', 'Endpoints existing proves the selector is right; the failure is between the client and the Service port.', 'Compare what the client uses with the PORT(S) column.'] } }];

  F['s32-cm-env-missing'] = [{ label: 'The ConfigMap exists, but the key is spelled with a different case',
    edit: function (c) {
      c.story = 'Deployment `site` reads env `THEME` from ConfigMap `site-config` key `theme`. The ConfigMap exists, but the pods fail with CreateContainerConfigError. Make the key available as `theme=dark`.';
      c.setup.push(Y('apiVersion: v1', 'kind: ConfigMap', 'metadata:', '  name: site-config', '  namespace: cfg', 'data:', '  Theme: dark', '  lang: en'));
      c.solution = ['kubectl describe pod -n cfg -l app=site', `kubectl patch configmap site-config -n cfg -p '{"data":{"theme":"dark"}}'`, 'kubectl get pods -n cfg'];
      task(c, 0, 'Add the key `theme=dark` to `site-config`', ['Keys are case-sensitive: `Theme` and `theme` are different keys.', '`kubectl get cm site-config -n cfg -o yaml`']);
    }, trap: 'Deleting and recreating the ConfigMap loses `lang`, which other pods may use. Add the missing key and keep the rest.',
    why: { m: ['ConfigMap keys are case-sensitive.', 'The pod event states which key it could not find.', 'Pods retry the start by themselves once the key exists.'] } }];

  F['s38-memory-too-high'] = [{ label: 'It is not the node: a ResourceQuota blocks the second pod',
    edit: function (c) {
      c.story = 'Deployment `report` requests 512Mi of memory per pod and the nodes have plenty. Only one pod runs; the second is never created. Lower the request to 128Mi so that both pods fit.';
      rep(c.setup, 'memory: 64Gi', 'memory: 512Mi');
      c.setup.push(Y('apiVersion: v1', 'kind: ResourceQuota', 'metadata:', '  name: mem-cap', '  namespace: mem', 'spec:', '  hard:', '    requests.memory: 600Mi'));
      c.solution = ['kubectl describe rs -n mem | grep -i quota', 'kubectl set resources deployment/report --requests=memory=128Mi -n mem', 'kubectl rollout status deployment/report -n mem'];
    }, trap: 'Raising the quota "fixes" it, but the quota is the team budget: the request is what is too big. Look at the ReplicaSet events, not at the nodes.',
    why: { m: ['A ResourceQuota is checked when a pod is created, so a pod over budget never exists: it shows as an event on the ReplicaSet, not as a Pending pod.', 'The node capacity is irrelevant here; the namespace budget is.', 'Lower the request in the template and the ReplicaSet can create the missing pod.'] } }];

  F['s12-netpol-isolate'] = [{ label: 'A policy already exists, but it selects the wrong pods',
    edit: function (c) {
      c.story = 'Everything in namespace `app` can still reach the `db` Service although a NetworkPolicy `db-allow-frontend` exists. Only pods labelled `role=frontend` should reach it. The `frontend` pod must keep working; the `intruder` pod must be blocked.';
      c.setup.push(Y('apiVersion: networking.k8s.io/v1', 'kind: NetworkPolicy', 'metadata:', '  name: db-allow-frontend', '  namespace: app', 'spec:', '  podSelector:', '    matchLabels:', '      app: database', '  policyTypes: [Ingress]', '  ingress:', '  - from:', '    - podSelector:', '        matchLabels:', '          role: frontend', '    ports:', '    - protocol: TCP', '      port: 80'));
      task(c, 0, 'Find why the policy does not isolate `db`', ['`kubectl get pods -n app --show-labels`: which label do the db pods carry?', 'A policy only affects pods its `podSelector` matches.'], [{ t: 'jp', ref: 'networkpolicy/db-allow-frontend', ns: 'app', path: '.spec.podSelector.matchLabels.app', eq: 'db' }]);
      c.solution = ['kubectl get pods -n app --show-labels', `kubectl patch networkpolicy db-allow-frontend -n app --type=merge -p '{"spec":{"podSelector":{"matchLabels":{"app":"db"}}}}'`, 'kubectl exec -n app intruder -- wget -qO- -T 2 db'];
    }, trap: 'Creating a second, deny-all policy blocks the frontend as well. The existing policy is right except for the label it selects.',
    why: { m: ['A NetworkPolicy isolates only the pods its `podSelector` matches; a selector that matches nothing isolates nothing.', 'Pods that no policy selects stay open to everyone, which is why the intruder still gets through.', 'Compare the selector with the pod labels (`--show-labels`) before editing the rules.'] } }];

  F['s13-pvc-pending'] = [{ label: 'The claim is fine; the pod names a claim that does not exist',
    edit: function (c) {
      c.story = 'Pod `store` in `data` should mount the PVC `store-data`, which exists and uses a valid StorageClass. The pod stays Pending. Fix it so the pod runs with its data volume.';
      rep(c.setup, 'storageClassName: fast', 'storageClassName: standard'); rep(c.setup, 'claimName: store-data', 'claimName: store-datas');
      task(c, 0, 'Find the cause', ['`kubectl describe pod store -n data`: read the last event.', 'The claim name in the pod does not match a PVC in the namespace.'], [{ t: 'jp', ref: 'pod/store', ns: 'data', path: '.spec.volumes[0].persistentVolumeClaim.claimName', eq: 'store-data' }]);
      c.solution = ['kubectl describe pod store -n data', 'kubectl get pvc -n data', 'kubectl delete pod store -n data --wait=false', "kubectl apply -f - <<EOF\napiVersion: v1\nkind: Pod\nmetadata:\n  name: store\n  namespace: data\n  labels:\n    app: store\nspec:\n  containers:\n  - name: store\n    image: nginx:1.25\n    volumeMounts:\n    - {name: d, mountPath: /data}\n  volumes:\n  - name: d\n    persistentVolumeClaim:\n      claimName: store-data\nEOF"];
    }, trap: 'Creating a new claim named `store-datas` makes the pod start but strands the real data in `store-data`. The pod points at the wrong name.',
    why: { m: ['A pod volume references a claim by name; a name that does not exist leaves the pod Pending with a clear event.', 'A pod\'s volumes cannot be edited in place: delete and recreate the pod with the right claimName.', 'With WaitForFirstConsumer the claim binds only after a pod uses it.'] } }];

  F['s11-rbac-sa'] = [{ label: 'The Role and RoleBinding exist, but the binding names the wrong ServiceAccount namespace',
    edit: function (c) {
      c.story = 'The CI system uses ServiceAccount `deployer` in namespace `ci`. A Role `deploy-manager` and a RoleBinding `deployer-binding` exist, yet the account still cannot create Deployments. Fix it so it can get/list/create/update Deployments in `ci` and nothing else (no deletes, no Secrets).';
      c.setup.push(Y('apiVersion: rbac.authorization.k8s.io/v1', 'kind: Role', 'metadata:', '  name: deploy-manager', '  namespace: ci', 'rules:', '- apiGroups: ["apps"]', '  resources: ["deployments"]', '  verbs: ["get", "list", "create", "update"]'));
      c.setup.push(Y('apiVersion: rbac.authorization.k8s.io/v1', 'kind: RoleBinding', 'metadata:', '  name: deployer-binding', '  namespace: ci', 'subjects:', '- kind: ServiceAccount', '  name: deployer', '  namespace: default', 'roleRef:', '  apiGroup: rbac.authorization.k8s.io', '  kind: Role', '  name: deploy-manager'));
      task(c, 0, 'Find why the binding grants nothing', ['`kubectl auth can-i create deployments --as=system:serviceaccount:ci:deployer -n ci`: no.', '`kubectl get rolebinding deployer-binding -n ci -o yaml`: read the subject namespace.'], [{ t: 'jp', ref: 'rolebinding/deployer-binding', ns: 'ci', path: '.subjects[0].namespace', eq: 'ci' }]);
      c.solution = ['kubectl get rolebinding deployer-binding -n ci -o yaml', 'kubectl delete rolebinding deployer-binding -n ci', 'kubectl create rolebinding deployer-binding --role=deploy-manager --serviceaccount=ci:deployer -n ci', 'kubectl auth can-i delete deployments --as=system:serviceaccount:ci:deployer -n ci'];
    }, trap: 'Binding `cluster-admin` fixes it in one line and ends least privilege. The Role is right: only the subject points at a ServiceAccount of the same name in another namespace.',
    why: { m: ['A ServiceAccount is identified by name AND namespace; `default:deployer` is a different account from `ci:deployer`.', 'A RoleBinding\'s roleRef cannot be changed, and its subjects are matched exactly.', 'Test with `kubectl auth can-i --as=system:serviceaccount:<ns>:<name>`, including a verb that must stay denied.'] } }];

  F['s06-rollout-rollback'] = [{ label: 'The new pods run but never become Ready (a bad readiness probe in the rollout)',
    edit: function (c) {
      c.story = 'A colleague pushed a change to `site`; the rollout is stuck: new pods are Running but never Ready while the old pods still serve traffic. Roll back, scale to 4, then upgrade to `nginx:1.27`.';
      c.setupCmds = [`kubectl patch deployment site -n release --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/readinessProbe","value":{"httpGet":{"path":"/nope","port":80}}}]'`];
      task(c, 0, 'Roll back the broken rollout', ['`kubectl rollout history deployment/site -n release`', '`kubectl describe pod` of the new pod shows the probe failure.'], [{ t: 'jpRe', ref: 'deploy/site', ns: 'release', path: '.spec.template.spec.containers[0]', re: '^(?![\\s\\S]*/nope)', msg: 'the broken readiness probe must be rolled back' }]);
    }, trap: 'Waiting for the rollout to finish never ends: the new ReplicaSet can never become Ready. Roll back first, then fix the cause before the next release.',
    why: { m: ['A rolling update only proceeds while new pods become Ready; a failing probe stalls it and the old pods keep serving.', '`rollout undo` goes back to the previous revision, including its probe settings.', 'Check `rollout status` and the new pod events before and after the rollback.'] } }];
})(typeof window !== 'undefined' ? window : globalThis);
