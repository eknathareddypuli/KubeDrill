/* Labs S208–S211: StatefulSet podManagementPolicy (immutable field, orphan delete), Service traffic policy and session affinity,
   digest-pinned images (invalid reference), and pod DNS settings (ndots, dnsConfig).
   Original scenarios from the public curriculum outline, not exam questions. Marked simOnly: verified in the simulator, not on a real cluster. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js');
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); o.curriculum = true; o.simOnly = true; return o; }
  function Y() { return Array.prototype.slice.call(arguments).join('\n') + '\n'; }
  function NSY(n) { return Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: ' + n); }
  var D1 = 'a1b2c3d4e5f60718'.repeat(4), D2 = '0f1e2d3c4b5a6978'.repeat(4), BAD = D1.slice(0, 62);
  var STS = function (img, policy) {
    return Y('apiVersion: apps/v1', 'kind: StatefulSet', 'metadata:', '  name: cache', '  namespace: sts-lab', 'spec:', '  serviceName: cache', '  replicas: 3',
      policy ? '  podManagementPolicy: ' + policy : '', '  selector:', '    matchLabels:', '      app: cache', '  template:', '    metadata:', '      labels:', '        app: cache', '    spec:', '      containers:', '      - name: cache',
      '        image: ' + img, '        volumeMounts:', '        - {name: data, mountPath: /data}', '  volumeClaimTemplates:', '  - metadata:', '      name: data', '    spec:', '      accessModes: [ReadWriteOnce]', '      resources:', '        requests:', '          storage: 1Gi').replace(/\n\n/g, '\n');
  };
  var HL = Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: cache', '  namespace: sts-lab', 'spec:', '  clusterIP: None', '  selector:', '    app: cache', '  ports:', '  - port: 6379');
  function DP(name, ns, img, extraSpec) {
    return Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: ' + name, '  namespace: ' + ns, 'spec:', '  replicas: 2', '  selector:', '    matchLabels:', '      app: ' + name, '  template:', '    metadata:', '      labels:', '        app: ' + name, '    spec:', extraSpec || '', '      containers:', '      - name: ' + name, '        image: ' + img).replace(/\n\n/g, '\n');
  }
  var SVC_BAD = Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: api', '  namespace: edge-svc', 'spec:', '  type: ClusterIP', '  externalTrafficPolicy: Local', '  sessionAffinity: ClientIP', '  sessionAffinityConfig:', '    clientIP:', '      timeoutSeconds: 3600', '  selector:', '    app: api', '  ports:', '  - port: 80', '    targetPort: 80', '    nodePort: 30090');

  Labs.register([
    // ── S208 StatefulSet podManagementPolicy ──
    L({ id: 's208-sts-parallel', num: 'S208', title: 'StatefulSet: one broken pod blocks the other two', diff: 'Advanced', track: ['CKA'], domain: 'Storage', time: '15 min', ns: 'sts-lab',
      story: 'StatefulSet `cache` in `sts-lab` should run 3 replicas, but only `cache-0` exists and it cannot pull its image (`redis:badtag`). The other two pods are never created because the default policy starts pods one at a time and waits for each to be Ready. Fix the image, then make the three pods start independently by setting `podManagementPolicy: Parallel`. The field cannot be changed on a live StatefulSet, and the data volumes must survive. The corrected manifest is in `/root/cache/sts.yaml`.',
      caution: 'Deleting the StatefulSet normally deletes its pods; add `--cascade=orphan` so pods and claims stay. Never delete the PersistentVolumeClaims: they hold the data. Fix `image` to `redis:7-alpine` in the file before applying.',
      setup: [NSY('sts-lab'), HL, STS('redis:badtag')],
      files: [{ path: '/root/cache/sts.yaml', content: STS('redis:badtag', 'Parallel') }],
      tasks: [
        T('Find out why only `cache-0` exists', ['`kubectl get pods -n sts-lab` and `kubectl describe pod cache-0 -n sts-lab`.', 'With the default `OrderedReady` policy, pod 1 is not created until pod 0 is Running and Ready.'], [{ t: 'exists', ref: 'sts/cache', ns: 'sts-lab' }]),
        T('`cache` uses `podManagementPolicy: Parallel` and image `redis:7-alpine`', ['Applying the file over the live StatefulSet is refused: the field is immutable.', '`kubectl delete sts cache -n sts-lab --cascade=orphan`, fix the image in `/root/cache/sts.yaml`, then `kubectl apply -f /root/cache/sts.yaml`.'], [{ t: 'jp', ref: 'sts/cache', ns: 'sts-lab', path: '.spec.podManagementPolicy', eq: 'Parallel' }, { t: 'jpRe', ref: 'sts/cache', ns: 'sts-lab', path: '.spec.template.spec.containers[0].image', re: '^redis:7-alpine$' }]),
        T('Three pods Running and all three claims still exist', ['The orphaned pod `cache-0` is fixed by deleting it once so the controller recreates it from the new template.', '`kubectl get pvc -n sts-lab` should list `data-cache-0`, `data-cache-1` and `data-cache-2`.'], [{ t: 'podsReady', ns: 'sts-lab', sel: 'app=cache', min: 3 }, { t: 'exists', ref: 'pvc/data-cache-0', ns: 'sts-lab' }, { t: 'exists', ref: 'pvc/data-cache-2', ns: 'sts-lab' }])
      ],
      solution: ['kubectl get pods -n sts-lab', 'kubectl delete sts cache -n sts-lab --cascade=orphan', "sed -i 's#redis:badtag#redis:7-alpine#' /root/cache/sts.yaml", 'kubectl apply -f /root/cache/sts.yaml', 'kubectl delete pod cache-0 -n sts-lab', 'kubectl get pods -n sts-lab'] }),

    // ── S209 Service traffic policy and affinity ──
    L({ id: 's209-svc-traffic-policy', num: 'S209', title: 'Service: keep client IPs and sticky sessions', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Services & Networking', time: '12 min', ns: 'edge-svc',
      story: 'Deployment `api` in `edge-svc` serves 3 replicas. The platform team wants the Service `api` reachable on node port 30090, the original client IP preserved for the pods, and each client to keep hitting the same pod for an hour. The manifest in `/root/api/svc.yaml` already holds the node port and policy fields, but `kubectl apply` is refused. Make the Service match the requirements.',
      caution: 'Do not drop the policy fields to make the apply succeed; the requirements are the point. Read the error: one field is only valid for certain Service types.',
      setup: [NSY('edge-svc'), DP('api', 'edge-svc', 'nginx:1.25').replace('replicas: 2', 'replicas: 3'), Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: api', '  namespace: edge-svc', 'spec:', '  selector:', '    app: api', '  ports:', '  - port: 80', '    targetPort: 80')],
      files: [{ path: '/root/api/svc.yaml', content: SVC_BAD }],
      tasks: [
        T('Read why the manifest is refused', ['`kubectl apply -f /root/api/svc.yaml` and read which field is invalid and why.'], [{ t: 'exists', ref: 'svc/api', ns: 'edge-svc' }]),
        T('`api` is a NodePort on 30090', ['Change `type` to `NodePort` in the file (it already carries `nodePort: 30090`).', '`kubectl edit` of the file with a text editor, or `sed`.'], [{ t: 'jp', ref: 'svc/api', ns: 'edge-svc', path: '.spec.type', eq: 'NodePort' }, { t: 'jp', ref: 'svc/api', ns: 'edge-svc', path: '.spec.ports[0].nodePort', eq: '30090' }]),
        T('Client IP preserved and one-hour sticky sessions', ['`externalTrafficPolicy: Local` keeps the client address; `sessionAffinity: ClientIP` with `timeoutSeconds: 3600` pins clients.', 'Apply the corrected file.'], [{ t: 'jp', ref: 'svc/api', ns: 'edge-svc', path: '.spec.externalTrafficPolicy', eq: 'Local' }, { t: 'jp', ref: 'svc/api', ns: 'edge-svc', path: '.spec.sessionAffinity', eq: 'ClientIP' }, { t: 'jp', ref: 'svc/api', ns: 'edge-svc', path: '.spec.sessionAffinityConfig.clientIP.timeoutSeconds', eq: '3600' }])
      ],
      solution: ["sed -i 's/type: ClusterIP/type: NodePort/' /root/api/svc.yaml", 'kubectl apply -f /root/api/svc.yaml', 'kubectl get svc api -n edge-svc'] }),

    // ── S210 digest pinning ──
    L({ id: 's210-image-digest', num: 'S210', title: 'Digest pinning: one image reference is malformed', diff: 'Intermediate', track: ['CKS', 'CKAD'], domain: 'Supply chain', time: '12 min', ns: 'supply-lab',
      story: 'The release policy for `supply-lab` says every image must be pinned by digest, never by a mutable tag. Deployment `api` was already pinned but its pods will not start: someone copied the digest by hand. Deployment `worker` still uses `nginx:latest`. The approved digests are in `/root/release/digests.txt` (one line per workload, format `name image@sha256:...`).',
      caution: 'Copy the reference from the file, do not retype it. A digest has exactly 64 hex characters. Do not go back to a tag to get the pods running: that fails the policy.',
      setup: [NSY('supply-lab'), DP('api', 'supply-lab', 'nginx@sha256:' + BAD), DP('worker', 'supply-lab', 'nginx:latest')],
      files: [{ path: '/root/release/digests.txt', content: 'api nginx@sha256:' + D1 + '\nworker nginx@sha256:' + D2 + '\n' }],
      tasks: [
        T('Find why the `api` pods do not start', ['`kubectl get pods -n supply-lab` and `kubectl describe pod` on one `api` pod.', 'The status is `InvalidImageName` and the event says the reference could not be parsed.'], [{ t: 'exists', ref: 'deploy/api', ns: 'supply-lab' }]),
        T('`api` pinned to the approved digest and Ready', ['`cat /root/release/digests.txt`, then `kubectl set image deploy/api api=<reference> -n supply-lab`.'], [{ t: 'jpRe', ref: 'deploy/api', ns: 'supply-lab', path: '.spec.template.spec.containers[0].image', re: '^nginx@sha256:' + D1 + '$' }, { t: 'podsReady', ns: 'supply-lab', sel: 'app=api', min: 2 }]),
        T('`worker` pinned to its approved digest', ['Same command for `worker`, with its own line from the file.'], [{ t: 'jpRe', ref: 'deploy/worker', ns: 'supply-lab', path: '.spec.template.spec.containers[0].image', re: '^nginx@sha256:' + D2 + '$' }, { t: 'podsReady', ns: 'supply-lab', sel: 'app=worker', min: 2 }])
      ],
      solution: ['kubectl get pods -n supply-lab', 'cat /root/release/digests.txt', 'kubectl set image deploy/api api=nginx@sha256:' + D1 + ' -n supply-lab', 'kubectl set image deploy/worker worker=nginx@sha256:' + D2 + ' -n supply-lab', 'kubectl get pods -n supply-lab'] }),

    // ── S211 ndots / dnsConfig ──
    L({ id: 's211-ndots-dnsconfig', num: 'S211', title: 'DNS: every external lookup tries five search domains first', diff: 'Advanced', track: ['CKA'], domain: 'Services & Networking', time: '15 min', ns: 'dns-lab',
      story: 'Deployment `fetcher` in `dns-lab` calls `api.partner.example.com`, a name with two dots. With the default `ndots:5` the resolver first tries it as a relative name under every search domain, so each call costs several failed queries. The application cannot be changed. Reduce the extra lookups from the pod spec only, and keep the pods using the cluster DNS for Service names.',
      caution: 'Do not set `dnsPolicy: None`: it removes the cluster DNS server and every Service name stops resolving. Keep `dnsPolicy: ClusterFirst` and add a `dnsConfig` option.',
      setup: [NSY('dns-lab'), DP('fetcher', 'dns-lab', 'busybox:1.36', '      dnsPolicy: ClusterFirst').replace('image: busybox:1.36', 'image: busybox:1.36\n        command: ["sleep", "3600"]')],
      tasks: [
        T('Read the resolver settings of a `fetcher` pod', ['`kubectl exec deploy/fetcher -n dns-lab -- cat /etc/resolv.conf`.', 'Note the search list and `options ndots:5`.'], [{ t: 'exists', ref: 'deploy/fetcher', ns: 'dns-lab' }]),
        T('`fetcher` pods use `ndots:1` through `dnsConfig`', ['`kubectl edit deploy fetcher -n dns-lab` and add under the pod spec `dnsConfig: {options: [{name: ndots, value: "1"}]}`.', 'The pods are replaced by the rollout.'], [{ t: 'jpRe', ref: 'deploy/fetcher', ns: 'dns-lab', path: '.spec.template.spec.dnsConfig.options[*].value', re: '^1$' }, { t: 'podsReady', ns: 'dns-lab', sel: 'app=fetcher', min: 2 }]),
        T('Cluster DNS still in use', ['`dnsPolicy` stays `ClusterFirst`.', 'Check the new pod: `cat /etc/resolv.conf` still lists the cluster nameserver and now says `ndots:1`.'], [{ t: 'jp', ref: 'deploy/fetcher', ns: 'dns-lab', path: '.spec.template.spec.dnsPolicy', eq: 'ClusterFirst' }])
      ],
      solution: ['kubectl exec deploy/fetcher -n dns-lab -- cat /etc/resolv.conf', `kubectl patch deploy fetcher -n dns-lab --type=merge -p '{"spec":{"template":{"spec":{"dnsConfig":{"options":[{"name":"ndots","value":"1"}]}}}}}'`, 'kubectl rollout status deploy/fetcher -n dns-lab', 'kubectl exec deploy/fetcher -n dns-lab -- cat /etc/resolv.conf'] }),

    // ── S212 RBAC bind / escalate ──
    L({ id: 's212-rbac-bind', num: 'S212', title: 'RBAC: a team lead may create bindings, but only for one role', diff: 'Advanced', track: ['CKA', 'CKS'], domain: 'Security', time: '15 min', ns: 'rbac-lab',
      story: 'In `rbac-lab` the user `team-lead` may create RoleBindings (ClusterRole `lead-role`, bound to them in this namespace) and read pods. They tried to create the RoleBinding `intern-view` (ClusterRole `view`, user `intern`) while acting as themselves with `--as team-lead`, and the API server refused it. The lead should be able to hand out the built-in `view` role in this namespace, and nothing else: not `admin`, and not the right to bypass the check. Then the binding must exist.',
      caution: 'Do not give `team-lead` the `escalate` verb or a wildcard: that lets them grant anything. The API server refuses to let a user grant permissions they do not hold unless they have `bind` on that specific role. Name the role in the rule.',
      setup: [NSY('rbac-lab'),
        Y('apiVersion: rbac.authorization.k8s.io/v1', 'kind: ClusterRole', 'metadata:', '  name: lead-role', 'rules:', '- apiGroups: ["rbac.authorization.k8s.io"]', '  resources: ["rolebindings"]', '  verbs: ["get", "list", "create"]', '- apiGroups: [""]', '  resources: ["pods"]', '  verbs: ["get", "list"]'),
        Y('apiVersion: rbac.authorization.k8s.io/v1', 'kind: RoleBinding', 'metadata:', '  name: lead', '  namespace: rbac-lab', 'subjects:', '- kind: User', '  name: team-lead', '  apiGroup: rbac.authorization.k8s.io', 'roleRef:', '  kind: ClusterRole', '  name: lead-role', '  apiGroup: rbac.authorization.k8s.io')],
      tasks: [
        T('See the refusal as `team-lead`', ['Run the create command from the story with `--as team-lead`.', 'Read the sentence about permissions "not currently held".'], [{ t: 'flag', k: 'escTried', v: true, msg: 'run the binding as team-lead and read the refusal' }]),
        T('`lead-role` may bind `view` only', ['Add a rule: apiGroup `rbac.authorization.k8s.io`, resource `clusterroles`, verb `bind`, `resourceNames: ["view"]`.', '`kubectl patch clusterrole lead-role --type=json -p \'[{"op":"add","path":"/rules/-","value":{...}}]\'` or `kubectl edit clusterrole lead-role`.'], [{ t: 'jpRe', ref: 'clusterrole/lead-role', ns: '', path: '.rules[*].verbs', re: 'bind' }, { t: 'jpRe', ref: 'clusterrole/lead-role', ns: '', path: '.rules[*].resourceNames', re: '^\\["view"\\]$' }, { t: 'jpRe', ref: 'clusterrole/lead-role', ns: '', path: '.rules[*].verbs', re: '^(?!.*(escalate|\\*))' }]),
        T('The RoleBinding `intern-view` exists, created as `team-lead`', ['Repeat the create command with `--as team-lead`; it now succeeds.'], [{ t: 'jp', ref: 'rolebinding/intern-view', ns: 'rbac-lab', path: '.roleRef.name', eq: 'view' }, { t: 'jp', ref: 'rolebinding/intern-view', ns: 'rbac-lab', path: '.subjects[0].name', eq: 'intern' }])
      ],
      solution: ['kubectl create rolebinding intern-view -n rbac-lab --clusterrole=view --user=intern --as team-lead', `kubectl patch clusterrole lead-role --type=json -p '[{"op":"add","path":"/rules/-","value":{"apiGroups":["rbac.authorization.k8s.io"],"resources":["clusterroles"],"verbs":["bind"],"resourceNames":["view"]}}]'`, 'kubectl create rolebinding intern-view -n rbac-lab --clusterrole=view --user=intern --as team-lead', 'kubectl get rolebinding -n rbac-lab'] }),

    // ── S213 StatefulSet canary with partition ──
    L({ id: 's213-sts-canary', num: 'S213', title: 'StatefulSet canary: update only the last pod', diff: 'Advanced', track: ['CKA'], domain: 'Workloads', time: '15 min', ns: 'canary-lab',
      story: 'StatefulSet `web` in `canary-lab` runs four pods on `nginx:1.25`. Release `nginx:1.27-alpine` as a canary: only `web-3` may run the new image; `web-0`, `web-1` and `web-2` must keep `nginx:1.25` until the canary is approved. All four pods stay Ready.',
      caution: 'Set the partition in the same change as the image. If the image changes first, the controller starts replacing pods from the highest ordinal down, and pods below the partition that are deleted later come back on the old revision.',
      setup: [NSY('canary-lab'), Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: web', '  namespace: canary-lab', 'spec:', '  clusterIP: None', '  selector:', '    app: web', '  ports:', '  - port: 80'),
        Y('apiVersion: apps/v1', 'kind: StatefulSet', 'metadata:', '  name: web', '  namespace: canary-lab', 'spec:', '  serviceName: web', '  replicas: 4', '  selector:', '    matchLabels:', '      app: web', '  template:', '    metadata:', '      labels:', '        app: web', '    spec:', '      containers:', '      - name: web', '        image: nginx:1.25')],
      tasks: [
        T('Partition 3 and the new image in the StatefulSet', ['`spec.updateStrategy.rollingUpdate.partition` is the first ordinal that is updated; pods below it are left alone.', 'One `kubectl patch` can change the partition and the image together.'], [{ t: 'jp', ref: 'sts/web', ns: 'canary-lab', path: '.spec.updateStrategy.rollingUpdate.partition', eq: '3' }, { t: 'jp', ref: 'sts/web', ns: 'canary-lab', path: '.spec.template.spec.containers[0].image', eq: 'nginx:1.27-alpine' }]),
        T('Only `web-3` runs the new image', ['`kubectl get pods -n canary-lab -o custom-columns=N:.metadata.name,I:.spec.containers[0].image`', '`kubectl rollout status sts/web -n canary-lab` says the partitioned roll out is complete.'], [{ t: 'jp', ref: 'pod/web-3', ns: 'canary-lab', path: '.spec.containers[0].image', eq: 'nginx:1.27-alpine' }, { t: 'jp', ref: 'pod/web-2', ns: 'canary-lab', path: '.spec.containers[0].image', eq: 'nginx:1.25' }]),
        T('The three older pods unchanged and everything Ready', ['`web-0` and `web-1` must still be on 1.25.'], [{ t: 'jp', ref: 'pod/web-0', ns: 'canary-lab', path: '.spec.containers[0].image', eq: 'nginx:1.25' }, { t: 'jp', ref: 'pod/web-1', ns: 'canary-lab', path: '.spec.containers[0].image', eq: 'nginx:1.25' }, { t: 'podsReady', ns: 'canary-lab', sel: 'app=web', min: 4 }])
      ],
      solution: [`kubectl patch sts web -n canary-lab --type=merge -p '{"spec":{"updateStrategy":{"type":"RollingUpdate","rollingUpdate":{"partition":3}},"template":{"spec":{"containers":[{"name":"web","image":"nginx:1.27-alpine"}]}}}}'`, 'kubectl rollout status sts/web -n canary-lab', 'kubectl get pods -n canary-lab -o wide'] }),

    // ── S214 finish a partitioned rollout ──
    L({ id: 's214-sts-finish-rollout', num: 'S214', title: 'StatefulSet rollout "complete" but three pods are still on the old image', diff: 'Advanced', track: ['CKA'], domain: 'Workloads', time: '12 min', ns: 'queue-lab',
      story: 'StatefulSet `queue` in `queue-lab` has five pods. A canary release moved the image to `nginx:1.27-alpine` with `partition: 3`, so only `queue-3` and `queue-4` run it. The canary was approved and the release must finish: all five pods on the new image, none left behind, without deleting any pod.',
      caution: 'Do not delete `queue-0` to "refresh" it: a pod below the partition is recreated from the old revision. `rollout status` already says the partitioned roll out is complete, which is true and not what you want.',
      setup: [NSY('queue-lab'), Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: queue', '  namespace: queue-lab', 'spec:', '  clusterIP: None', '  selector:', '    app: queue', '  ports:', '  - port: 80'),
        Y('apiVersion: apps/v1', 'kind: StatefulSet', 'metadata:', '  name: queue', '  namespace: queue-lab', 'spec:', '  serviceName: queue', '  replicas: 5', '  updateStrategy:', '    type: RollingUpdate', '    rollingUpdate:', '      partition: 3', '  selector:', '    matchLabels:', '      app: queue', '  template:', '    metadata:', '      labels:', '        app: queue', '    spec:', '      containers:', '      - name: queue', '        image: nginx:1.25')],
      setupCmds: ['kubectl rollout status sts/queue -n queue-lab', `kubectl set image sts/queue queue=nginx:1.27-alpine -n queue-lab`, 'kubectl rollout status sts/queue -n queue-lab'],
      tasks: [
        T('Read the rollout state', ['`kubectl rollout status sts/queue -n queue-lab` and `kubectl get sts queue -n queue-lab -o jsonpath=\'{.spec.updateStrategy.rollingUpdate.partition}\'`.'], [{ t: 'exists', ref: 'sts/queue', ns: 'queue-lab' }]),
        T('Partition lowered to 0', ['The partition is the first ordinal that is updated; `0` means every pod.', '`kubectl patch sts queue -n queue-lab -p \'{"spec":{"updateStrategy":{"rollingUpdate":{"partition":0}}}}\'`'], [{ t: 'jp', ref: 'sts/queue', ns: 'queue-lab', path: '.spec.updateStrategy.rollingUpdate.partition', eq: '0' }]),
        T('All five pods on `nginx:1.27-alpine` and Ready', ['The controller replaces pods from the highest ordinal down, one at a time; check `queue-0` to `queue-4`, for example `queue-2`.', '`kubectl rollout status sts/queue -n queue-lab` waits for it.'], [{ t: 'jp', ref: 'pod/queue-0', ns: 'queue-lab', path: '.spec.containers[0].image', eq: 'nginx:1.27-alpine' }, { t: 'jp', ref: 'pod/queue-2', ns: 'queue-lab', path: '.spec.containers[0].image', eq: 'nginx:1.27-alpine' }, { t: 'jp', ref: 'sts/queue', ns: 'queue-lab', path: '.status.updatedReplicas', eq: '5' }, { t: 'podsReady', ns: 'queue-lab', sel: 'app=queue', min: 5 }])
      ],
      solution: [`kubectl patch sts queue -n queue-lab -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":0}}}}'`, 'kubectl rollout status sts/queue -n queue-lab', 'kubectl get pods -n queue-lab'] }),

    // ── S215 admin client certificate ──
    L({ id: 's215-admin-cert-renew', num: 'S215', title: 'Only the admin certificate expired: renew it and refresh the kubeconfig', diff: 'Advanced', track: ['CKA'], domain: 'Cluster', time: '15 min', ns: 'shop',
      story: 'Every `kubectl` call from this workstation fails with `You must be logged in to the server (Unauthorized)`. The API server is healthy: the pods keep running. The client certificate in `~/.kube/config` (a copy of `/etc/kubernetes/admin.conf` from `cp1`) expired. Find out which certificate it is, renew only that one on `cp1`, and refresh the workstation kubeconfig. kubectl is unusable until then, so use ssh for the node.',
      caution: 'Renewing on the node does not change the copy on this workstation. Do not renew `all` and restart the control plane: nothing else is expiring. The certificate authorities are not renewed with `kubeadm certs renew`.',
      setup: [NSY('shop'), Y('apiVersion: v1', 'kind: ConfigMap', 'metadata:', '  name: marker', '  namespace: shop', 'data:', '  note: keep')], flags: { certAdminExpired: true },
      tasks: [
        T('Check expiry on `cp1` and find the expired certificate', ['`ssh cp1 \'sudo kubeadm certs check-expiration\'`', 'Look for `<invalid>` in the residual time column.'], [{ t: 'flag', k: 'certChecked', v: true, msg: 'run kubeadm certs check-expiration on cp1' }]),
        T('Renew only `admin.conf`', ['`ssh cp1 \'sudo kubeadm certs renew admin.conf\'`'], [{ t: 'flag', k: 'adminRenewed', v: true, msg: 'the admin.conf certificate should be renewed' }]),
        T('Refresh the workstation kubeconfig; kubectl works', ['`scp cp1:/etc/kubernetes/admin.conf ~/.kube/config`', 'Copying before the renewal copies the expired certificate again.'], [{ t: 'flag', k: 'certAdminExpired', v: false, msg: 'kubectl should be able to log in again' }])
      ],
      solution: ["ssh cp1 'sudo kubeadm certs check-expiration'", "ssh cp1 'sudo kubeadm certs renew admin.conf'", 'scp cp1:/etc/kubernetes/admin.conf ~/.kube/config', 'kubectl get nodes'] }),

    // ── S216 game-day: three faults ──
    L({ id: 's216-gameday-three', num: 'S216', title: 'Game day: three independent faults in one namespace', diff: 'Advanced', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '25 min', ns: 'gameday',
      story: 'The `gameday` namespace runs three workloads and each one is broken in a different way: Deployment `web` (2 pods), Deployment `api` (2 pods, with a Service `api` that must answer on port 80 for the `tester` pod), and Deployment `worker` (2 pods). Nothing has been changed on purpose; find each cause from the evidence and fix it. Treat it as a timed drill: 25 minutes.',
      caution: 'The three faults are unrelated, so fixing one does not help the others. Start with `kubectl get pods -n gameday` and `kubectl get events -n gameday`, then take them one at a time. Do not recreate the namespace.',
      setup: [NSY('gameday'), Labs.y.dep('web', 'gameday', 'nginx:1.25-badtag', 2), Labs.y.dep('api', 'gameday', 'nginx:1.25', 2), Labs.y.svc('api', 'gameday', 'api', 80, 8080), Labs.y.tester('gameday'),
        Y('apiVersion: v1', 'kind: ConfigMap', 'metadata:', '  name: worker-config', '  namespace: gameday', 'data:', '  Mode: batch'),
        Labs.y.dep('worker', 'gameday', 'nginx:1.25', 2, '        env:\n        - name: MODE\n          valueFrom:\n            configMapKeyRef:\n              name: worker-config\n              key: mode\n')],
      tasks: [
        T('`web` pods Ready', ['`kubectl describe pod` on a `web` pod: the image reference cannot be found.', 'Use the tag `1.25`.'], [{ t: 'podsReady', ns: 'gameday', sel: 'app=web', min: 2 }]),
        T('`tester` reaches `api:80`', ['Pods are Ready, but the Service forwards to the wrong port: compare `targetPort` with the container port.', '`kubectl exec tester -n gameday -- wget -qO- -T 2 api`'], [{ t: 'curl', ns: 'gameday', from: 'tester', to: 'api:80' }]),
        T('`worker` pods Ready', ['The pod status is `CreateContainerConfigError`: read the event.', 'The ConfigMap key is spelled differently from the one the Deployment asks for.'], [{ t: 'podsReady', ns: 'gameday', sel: 'app=worker', min: 2 }, { t: 'jp', ref: 'cm/worker-config', ns: 'gameday', path: '.data.Mode', eq: 'batch' }])
      ],
      solution: ['kubectl get pods -n gameday', 'kubectl set image deploy/web web=nginx:1.25 -n gameday', `kubectl patch svc api -n gameday --type=json -p '[{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'`, `kubectl patch deploy worker -n gameday --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/env/0/valueFrom/configMapKeyRef/key","value":"Mode"}]'`, 'kubectl get pods -n gameday'] })
  ]);
  if (KL.COMP) KL.COMP.add({ 's208-sts-parallel': 'cka-sts cka-pv', 's209-svc-traffic-policy': 'cka-svc ckad-svc', 's210-image-digest': 'cks-supply ckad-image', 's211-ndots-dnsconfig': 'cka-dns cka-net', 's212-rbac-bind': 'cka-rbac cks-rbac', 's213-sts-canary': 'cka-sts cka-deploy', 's214-sts-finish-rollout': 'cka-sts cka-deploy', 's215-admin-cert-renew': 'cka-certs cka-kubeadm', 's216-gameday-three': 'cka-pod cka-svc ckad-debug' });
})(typeof window !== 'undefined' ? window : globalThis);
