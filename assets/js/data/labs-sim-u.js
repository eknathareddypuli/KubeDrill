/* Labs S198–S207: scheduling constraints (topology spread, hostPort, volume node affinity), admission errors (requests above limits,
   downward API, immutable selector and Pod fields), imagePullPolicy Never, suspended Jobs and a read-only root filesystem.
   Original scenarios from the public curriculum outline, not exam questions. Marked simOnly: verified in the simulator, not on a real cluster. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js');
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); o.curriculum = true; o.simOnly = true; return o; }
  function Y() { return Array.prototype.slice.call(arguments).join('\n') + '\n'; }
  function NSY(n) { return Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: ' + n); }
  function DEPL(name, ns, replicas, labels, containers, extraSpec) {
    return Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: ' + name, '  namespace: ' + ns, 'spec:', '  replicas: ' + replicas, '  selector:', '    matchLabels:', '      app: ' + name, '  template:', '    metadata:', '      labels:', '        app: ' + name, labels || '', '    spec:', extraSpec || '', '      containers:', containers).replace(/\n\n/g, '\n');
  }
  function ctr(name, image, extra) { return '      - name: ' + name + '\n        image: ' + image + (extra ? '\n' + extra : ''); }

  var PV_YAML = Y('apiVersion: v1', 'kind: PersistentVolume', 'metadata:', '  name: db-pv', 'spec:', '  capacity:', '    storage: 1Gi', '  accessModes: [ReadWriteOnce]', '  persistentVolumeReclaimPolicy: Retain', '  storageClassName: local-disks', '  local:', '    path: /mnt/disks/db', '  nodeAffinity:', '    required:', '      nodeSelectorTerms:', '      - matchExpressions:', '        - key: kubernetes.io/hostname', '          operator: In', '          values: [worker9]'), PVC_YAML = Y('apiVersion: v1', 'kind: PersistentVolumeClaim', 'metadata:', '  name: db-data', '  namespace: pvaff-lab', 'spec:', '  storageClassName: local-disks', '  accessModes: [ReadWriteOnce]', '  resources:', '    requests:', '      storage: 1Gi'), POD_YAML = Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: db', '  namespace: pvaff-lab', 'spec:', '  containers:', '  - name: db', '    image: nginx:1.25', '    volumeMounts:', '    - name: data', '      mountPath: /data', '  volumes:', '  - name: data', '    persistentVolumeClaim:', '      claimName: db-data');

  Labs.register([
    // ── S198 topology spread ──
    L({ id: 's198-topology-spread', num: 'S198', title: 'Topology spread: three pods stay Pending with free nodes', diff: 'Advanced', track: ['CKA'], domain: 'Scheduling', time: '15 min', ns: 'spread-lab',
      story: 'Deployment `web` in `spread-lab` (4 replicas, 600m CPU each) must be spread across the two zones, so it carries a `topologySpreadConstraints` entry with `maxSkew: 1` and `whenUnsatisfiable: DoNotSchedule` on `topology.kubernetes.io/zone`. Zone `a` is `worker1`, zone `b` is `worker2`. Only one pod runs; three are Pending even though `worker1` has plenty of CPU. The batch Deployment `hog` (do not touch it) fills most of `worker2`. Get all four `web` pods Running and keep a spread constraint on the pod template.',
      caution: 'Do not delete `hog` (it is a batch job another team owns) and do not remove the constraint to make the pods schedule: the spread is a requirement, only its strictness is up for discussion. Read the scheduler\'s message before choosing which knob to turn.',
      setup: [NSY('spread-lab')],
      setupCmds: ['kubectl label node worker1 topology.kubernetes.io/zone=a', 'kubectl label node worker2 topology.kubernetes.io/zone=b',
        'kubectl apply -f - <<EOF\n' + DEPL('hog', 'spread-lab', 1, '', ctr('hog', 'nginx:1.25', '        resources:\n          requests:\n            cpu: 3500m'), '      nodeSelector:\n        topology.kubernetes.io/zone: b') + 'EOF',
        'kubectl apply -f - <<EOF\n' + DEPL('web', 'spread-lab', 4, '', ctr('web', 'nginx:1.25', '        resources:\n          requests:\n            cpu: 600m'), '      topologySpreadConstraints:\n      - maxSkew: 1\n        topologyKey: topology.kubernetes.io/zone\n        whenUnsatisfiable: DoNotSchedule\n        labelSelector:\n          matchLabels:\n            app: web') + 'EOF'],
      tasks: [
        T('Find out why the pods are Pending', ['`kubectl describe pod` on a Pending `web` pod, or `kubectl get events -n spread-lab`.', 'Look for the words `topology spread constraints` and for what else is wrong with the other zone.'], [{ t: 'jpRe', ref: 'deploy/hog', ns: 'spread-lab', path: '.spec.replicas', re: '^1$', msg: 'the `hog` Deployment must stay as it is' }]),
        T('All four `web` pods Running, spread constraint still present', ['The pods cannot go to zone `a` twice in a row (skew 2) and zone `b` has no room. Allow a larger skew or relax `whenUnsatisfiable` to `ScheduleAnyway`.', '`kubectl edit deploy web -n spread-lab` or `kubectl patch` on the topologySpreadConstraints list.'], [{ t: 'podsReady', ns: 'spread-lab', sel: 'app=web', min: 4 }, { t: 'jpRe', ref: 'deploy/web', ns: 'spread-lab', path: '.spec.template.spec.topologySpreadConstraints[0].topologyKey', re: '^topology\\.kubernetes\\.io/zone$', msg: 'keep a spread constraint on the zone label' }])
      ],
      solution: ['kubectl get pods -n spread-lab -o wide', 'kubectl get events -n spread-lab --field-selector reason=FailedScheduling', `kubectl patch deploy web -n spread-lab --type=json -p '[{"op":"replace","path":"/spec/template/spec/topologySpreadConstraints/0/whenUnsatisfiable","value":"ScheduleAnyway"}]'`, 'kubectl rollout status deploy/web -n spread-lab'] }),

    // ── S199 PV node affinity ──
    L({ id: 's199-pv-node-affinity', num: 'S199', title: 'Volume node affinity conflict: the disk is on a different node', diff: 'Advanced', track: ['CKA'], domain: 'Storage', time: '15 min', ns: 'pvaff-lab',
      story: 'In `pvaff-lab` the Pod `db` mounts the claim `db-data`, bound to the local PersistentVolume `db-pv` (`/mnt/disks/db`). The pod is Pending. The disk is physically attached to `worker2`, but the manifests in `/root/db/` were written with a typo in the PV\'s node affinity. Fix the typo in `/root/db/pv.yaml` and bring the pod up on `worker2`.',
      caution: 'A bound PV\'s `nodeAffinity` is not a field you can normally edit in place, and the pod\'s data must not move: delete the objects (pod, claim, volume) and recreate them from the corrected file. The PV reclaim policy is `Retain`, so the data on the disk is kept.',
      setup: [NSY('pvaff-lab'), PV_YAML, PVC_YAML, POD_YAML],
      files: [
        { path: '/root/db/pv.yaml', content: PV_YAML },
        { path: '/root/db/pvc.yaml', content: PVC_YAML },
        { path: '/root/db/pod.yaml', content: POD_YAML }],
      tasks: [
        T('Read why the pod is Pending', ['`kubectl describe pod db -n pvaff-lab` or the namespace events.', 'The message names a conflict between the volume and the nodes.'], [{ t: 'exists', ref: 'pv/db-pv', ns: '' }]),
        T('The PV targets `worker2`', ['Fix the hostname in `/root/db/pv.yaml`, then recreate: pod, claim and volume are deleted first because the bound volume\'s affinity cannot be changed in place.', '`kubectl delete -f /root/db/pod.yaml -f /root/db/pvc.yaml -f /root/db/pv.yaml`, then apply the three files again in order.'], [{ t: 'jp', ref: 'pv/db-pv', ns: '', path: '.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0]', eq: 'worker2', msg: 'the volume must be tied to the node that holds the disk' }]),
        T('Pod `db` Running on `worker2` with the claim Bound', ['Apply the PV first, then the claim, then the pod.'], [{ t: 'jp', ref: 'pod/db', ns: 'pvaff-lab', path: '.spec.nodeName', eq: 'worker2' }, { t: 'jp', ref: 'pvc/db-data', ns: 'pvaff-lab', path: '.status.phase', eq: 'Bound' }])
      ],
      solution: ['kubectl describe pod db -n pvaff-lab', 'kubectl delete -f /root/db/pod.yaml -f /root/db/pvc.yaml -f /root/db/pv.yaml', "sed -i 's/worker9/worker2/' /root/db/pv.yaml", 'kubectl apply -f /root/db/pv.yaml', 'kubectl apply -f /root/db/pvc.yaml', 'kubectl apply -f /root/db/pod.yaml', 'kubectl get pod db -n pvaff-lab -o wide'] }),

    // ── S200 hostPort ──
    L({ id: 's200-hostport-conflict', num: 'S200', title: 'hostPort: only two of four replicas can ever run', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Scheduling', time: '12 min', ns: 'edge-lab',
      story: 'Deployment `edge` in `edge-lab` runs 4 replicas, each asking for `hostPort: 8080`. Two pods are Running and two are Pending with a message about free ports. A node can give a host port to only one pod, and there are two worker nodes. All four replicas must run. Remove the `hostPort` and publish the app through a **NodePort** Service named `edge` (port 80, nodePort `30080`) instead.',
      caution: 'Do not scale the Deployment down to 2 to hide the problem: the replica count is a requirement. A `hostPort` ties a pod to one port on one node, which also limits rolling updates; a Service does not.',
      setup: [NSY('edge-lab'), DEPL('edge', 'edge-lab', 4, '', ctr('web', 'nginx:1.25', '        ports:\n        - containerPort: 80\n          hostPort: 8080'))],
      tasks: [
        T('Find the scheduling message for the Pending pods', ['`kubectl describe pod <pending pod> -n edge-lab` or the namespace events.', 'It says a node did not have free ports for the requested pod ports.'], [{ t: 'jp', ref: 'deploy/edge', ns: 'edge-lab', path: '.spec.replicas', eq: '4', msg: 'keep four replicas' }]),
        T('Four replicas Running without a `hostPort`', ['Remove `hostPort` from the container port (keep `containerPort: 80`).', '`kubectl edit deploy edge -n edge-lab`'], [{ t: 'jpRe', ref: 'deploy/edge', ns: 'edge-lab', path: '.spec.template.spec.containers[0].ports', re: '^(?![\\s\\S]*hostPort)', msg: 'no container port may keep a hostPort' }, { t: 'podsReady', ns: 'edge-lab', sel: 'app=edge', min: 4 }]),
        T('Service `edge` is a NodePort on 30080', ['`kubectl expose deploy edge --type=NodePort --port=80 -n edge-lab`, then set the nodePort, or write the Service YAML.'], [{ t: 'jp', ref: 'svc/edge', ns: 'edge-lab', path: '.spec.type', eq: 'NodePort' }, { t: 'jp', ref: 'svc/edge', ns: 'edge-lab', path: '.spec.ports[0].nodePort', eq: '30080' }])
      ],
      solution: ['kubectl get pods -n edge-lab -o wide', `kubectl patch deploy edge -n edge-lab --type=json -p '[{"op":"remove","path":"/spec/template/spec/containers/0/ports/0/hostPort"}]'`, 'kubectl rollout status deploy/edge -n edge-lab', `kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: edge
  namespace: edge-lab
spec:
  type: NodePort
  selector:
    app: edge
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
EOF`] }),

    // ── S201 requests above limits ──
    L({ id: 's201-requests-above-limits', num: 'S201', title: 'kubectl apply is refused: requests above limits', diff: 'Beginner', track: ['CKAD'], domain: 'Configuration', time: '8 min', ns: 'req-lab',
      story: 'The manifest `/root/shop/deploy.yaml` defines Deployment `shop` (2 replicas) in `req-lab`. `kubectl apply -f` is refused with an error about the resource requests. Fix the file so it applies, and keep **both** requests and limits for CPU and memory in it (the namespace policy requires them).',
      caution: 'A request is what the scheduler reserves; a limit is the ceiling. A request above its own limit can never be honoured, so the API server refuses the object. Do not delete the resources block to make the error go away.',
      setup: [NSY('req-lab')],
      files: [{ path: '/root/shop/deploy.yaml', content: DEPL('shop', 'req-lab', 2, '', ctr('shop', 'nginx:1.25', '        resources:\n          requests:\n            cpu: 500m\n            memory: 128Mi\n          limits:\n            cpu: 250m\n            memory: 256Mi')) }],
      tasks: [
        T('Read the validation error', ['Run `kubectl apply -f /root/shop/deploy.yaml` and read the field path in the message.'], [{ t: 'exists', ref: 'ns/req-lab', ns: '' }]),
        T('`shop` is created with both requests and limits', ['Lower the CPU request or raise the CPU limit so that the request is not larger than the limit, then apply the file.'], [{ t: 'exists', ref: 'deploy/shop', ns: 'req-lab' }, { t: 'jpRe', ref: 'deploy/shop', ns: 'req-lab', path: '.spec.template.spec.containers[0].resources.requests.cpu', re: '^.+$', msg: 'keep the CPU request' }, { t: 'jpRe', ref: 'deploy/shop', ns: 'req-lab', path: '.spec.template.spec.containers[0].resources.limits.memory', re: '^.+$', msg: 'keep the memory limit' }]),
        T('Both replicas are Ready', ['`kubectl get pods -n req-lab`'], [{ t: 'podsReady', ns: 'req-lab', sel: 'app=shop', min: 2 }])
      ],
      solution: ["sed -i 's/cpu: 250m/cpu: 750m/' /root/shop/deploy.yaml", 'kubectl apply -f /root/shop/deploy.yaml', 'kubectl rollout status deploy/shop -n req-lab'] }),

    // ── S202 imagePullPolicy Never ──
    L({ id: 's202-pull-policy-never', num: 'S202', title: 'ErrImageNeverPull: the image is not on the node', diff: 'Beginner', track: ['CKAD'], domain: 'Configuration', time: '8 min', ns: 'pull-lab',
      story: 'Deployment `reporter` in `pull-lab` uses image `reporter:2.0` and `imagePullPolicy: Never`. Its pod stays at `ErrImageNeverPull`. The image is published in the registry, not preloaded on the nodes. Make the pods start, keeping the image `reporter:2.0`.',
      caution: 'Do not change the image name or tag to something that happens to exist. `Never` is for images you load onto each node yourself; for registry images use `IfNotPresent` (or `Always`).',
      setup: [NSY('pull-lab'), DEPL('reporter', 'pull-lab', 1, '', ctr('reporter', 'reporter:2.0', '        imagePullPolicy: Never'))],
      tasks: [
        T('Read the event that explains the status', ['`kubectl describe pod -n pull-lab` shows `ErrImageNeverPull` and a message about the pull policy.'], [{ t: 'jp', ref: 'deploy/reporter', ns: 'pull-lab', path: '.spec.template.spec.containers[0].image', eq: 'reporter:2.0', msg: 'keep the image reporter:2.0' }]),
        T('The pod runs with a policy that can pull', ['Set `imagePullPolicy` to `IfNotPresent`.', '`kubectl patch deploy reporter -n pull-lab ...` or `kubectl edit`.'], [{ t: 'jpRe', ref: 'deploy/reporter', ns: 'pull-lab', path: '.spec.template.spec.containers[0].imagePullPolicy', re: '^(IfNotPresent|Always)$', msg: 'use a pull policy that can fetch the image' }, { t: 'podsReady', ns: 'pull-lab', sel: 'app=reporter', min: 1 }])
      ],
      solution: ['kubectl get pods -n pull-lab', 'kubectl describe pods -n pull-lab', `kubectl patch deploy reporter -n pull-lab -p '{"spec":{"template":{"spec":{"containers":[{"name":"reporter","imagePullPolicy":"IfNotPresent"}]}}}}'`, 'kubectl rollout status deploy/reporter -n pull-lab'] }),

    // ── S203 downward API ──
    L({ id: 's203-downward-api', num: 'S203', title: 'Downward API: pass the node name and pod IP to the container', diff: 'Intermediate', track: ['CKAD'], domain: 'Configuration', time: '10 min', ns: 'down-lab',
      story: 'The manifest `/root/agent/pod.yaml` defines Pod `agent` in `down-lab`. It must receive two environment variables from the Downward API: `NODE_NAME` (the node it runs on) and `POD_IP` (its own IP). The file has a typo in one `fieldPath` and the API server refuses it. Fix the file, create the pod, and read both values from inside the running container.',
      caution: 'Field paths are exact and case-sensitive (`spec.nodeName`, not `spec.nodename`). Environment variables are fixed when the container starts, so a changed value needs a new pod, not a restart of the process.',
      setup: [NSY('down-lab')],
      files: [{ path: '/root/agent/pod.yaml', content: Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: agent', '  namespace: down-lab', 'spec:', '  containers:', '  - name: agent', '    image: busybox:1.36', '    command: ["sleep", "3600"]', '    env:', '    - name: NODE_NAME', '      valueFrom:', '        fieldRef:', '          fieldPath: spec.nodename', '    - name: POD_IP', '      valueFrom:', '        fieldRef:', '          fieldPath: status.podIP') }],
      tasks: [
        T('Create the pod with both fields', ['`kubectl apply -f /root/agent/pod.yaml` and read the list of supported values in the error.'], [{ t: 'jp', ref: 'pod/agent', ns: 'down-lab', path: '.spec.containers[0].env[0].valueFrom.fieldRef.fieldPath', eq: 'spec.nodeName' }, { t: 'jp', ref: 'pod/agent', ns: 'down-lab', path: '.spec.containers[0].env[1].valueFrom.fieldRef.fieldPath', eq: 'status.podIP' }]),
        T('Save the value of `NODE_NAME` from inside the pod to `/root/node.txt`', ['`kubectl exec agent -n down-lab -- printenv NODE_NAME > /root/node.txt`'], [{ t: 'fileRe', path: '/root/node.txt', re: '^worker[12]\\s*$', msg: 'the file must hold the node the pod really runs on' }, { t: 'podsReady', ns: 'down-lab', sel: '', min: 1 }])
      ],
      solution: ["sed -i 's/spec.nodename/spec.nodeName/' /root/agent/pod.yaml", 'kubectl apply -f /root/agent/pod.yaml', 'kubectl wait --for=condition=Ready pod/agent -n down-lab', 'kubectl exec agent -n down-lab -- printenv NODE_NAME > /root/node.txt'] }),

    // ── S204 suspended Job ──
    L({ id: 's204-job-suspended', num: 'S204', title: 'The Job exists but never runs: suspended', diff: 'Beginner', track: ['CKAD'], domain: 'Workloads', time: '8 min', ns: 'jobs-lab',
      story: 'The pipeline created Job `nightly-report` in `jobs-lab` an hour ago. `kubectl get jobs` shows `0/1` and no pod ever appeared. Nothing is wrong with the image or the command. Make the Job run to completion, without recreating it (its history and name must stay).',
      caution: 'Deleting and re-creating the Job would also work but loses its history and may re-run work. `suspend` exists so that a controller or a person can hold a Job and release it later: change that field.',
      setup: [NSY('jobs-lab'), Y('apiVersion: batch/v1', 'kind: Job', 'metadata:', '  name: nightly-report', '  namespace: jobs-lab', 'spec:', '  suspend: true', '  template:', '    spec:', '      restartPolicy: Never', '      containers:', '      - name: report', '        image: busybox:1.36', '        command: ["sh", "-c", "echo report generated"]')],
      tasks: [
        T('Find why no pod was created', ['`kubectl describe job nightly-report -n jobs-lab` and look at its status and conditions.'], [{ t: 'exists', ref: 'job/nightly-report', ns: 'jobs-lab' }]),
        T('The Job is released and completes', ['Set `spec.suspend` to `false`: `kubectl patch job ... -p \'{"spec":{"suspend":false}}\'`.'], [{ t: 'jp', ref: 'job/nightly-report', ns: 'jobs-lab', path: '.spec.suspend', eq: 'false' }, { t: 'jp', ref: 'job/nightly-report', ns: 'jobs-lab', path: '.status.succeeded', eq: '1' }])
      ],
      solution: ['kubectl get jobs -n jobs-lab', 'kubectl describe job nightly-report -n jobs-lab', `kubectl patch job nightly-report -n jobs-lab -p '{"spec":{"suspend":false}}'`, 'kubectl get jobs -n jobs-lab'] }),

    // ── S205 read-only root filesystem ──
    L({ id: 's205-readonly-rootfs', num: 'S205', title: 'Read-only root filesystem: nginx crashes at start', diff: 'Intermediate', flags: { rofsStrict: true }, track: ['CKS', 'CKAD'], domain: 'System Hardening', time: '15 min', ns: 'rofs-lab',
      story: 'Deployment `site` in `rofs-lab` was hardened with `readOnlyRootFilesystem: true`, and now its pods are in CrashLoopBackOff. Save the failing container\'s log to `/root/rofs.log`, then fix the Deployment so the pods run while the root filesystem stays **read-only**. Give the container writable `emptyDir` volumes only where nginx writes: `/var/cache/nginx` and `/var/run`.',
      caution: 'Setting `readOnlyRootFilesystem` back to false makes the pods start and throws away the hardening. Writable volumes at exactly the paths the process needs are the fix: everything else stays immutable.',
      setup: [NSY('rofs-lab'), DEPL('site', 'rofs-lab', 2, '', ctr('site', 'nginx:1.25', '        securityContext:\n          readOnlyRootFilesystem: true'))],
      tasks: [
        T('Save the crash log to `/root/rofs.log`', ['`kubectl logs <pod> -n rofs-lab` (add `--previous` if the container has already restarted).', 'The log names a directory that is a read-only file system.'], [{ t: 'fileRe', path: '/root/rofs.log', re: 'Read-only file system', msg: 'the file must hold the log that names the failing path' }]),
        T('Pods run with a read-only root and two writable volumes', ['Add two `emptyDir` volumes and mount them at `/var/cache/nginx` and `/var/run` in the container.', '`kubectl edit deploy site -n rofs-lab`'], [{ t: 'jp', ref: 'deploy/site', ns: 'rofs-lab', path: '.spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem', eq: 'true', msg: 'the root filesystem must stay read-only' }, { t: 'jpRe', ref: 'deploy/site', ns: 'rofs-lab', path: '.spec.template.spec.volumes[1].name', re: '^.+$', msg: 'two writable volumes are needed' }, { t: 'podsReady', ns: 'rofs-lab', sel: 'app=site', min: 2 }])
      ],
      solution: ['kubectl get pods -n rofs-lab', "kubectl logs $(kubectl get pods -n rofs-lab -o jsonpath='{.items[0].metadata.name}') -n rofs-lab > /root/rofs.log", `kubectl patch deploy site -n rofs-lab --type=json -p '[{"op":"add","path":"/spec/template/spec/volumes","value":[{"name":"cache","emptyDir":{}},{"name":"run","emptyDir":{}}]},{"op":"add","path":"/spec/template/spec/containers/0/volumeMounts","value":[{"name":"cache","mountPath":"/var/cache/nginx"},{"name":"run","mountPath":"/var/run"}]}]'`, 'kubectl rollout status deploy/site -n rofs-lab'] }),

    // ── S206 immutable selector ──
    L({ id: 's206-immutable-selector', num: 'S206', title: 'apply fails: the Deployment selector is immutable', diff: 'Intermediate', track: ['CKAD', 'CKA'], domain: 'Deployment', time: '12 min', ns: 'sel-lab',
      story: 'Deployment `api` in `sel-lab` selects pods by `app: api`. A new manifest `/root/api/deploy.yaml` adds the label `tier: backend` to the selector and the pod template, and `kubectl apply` is refused. The Service `api` (selector `app: api`) must keep serving, and the Deployment must end up selecting on both labels with 2 Ready pods. Apply the new definition.',
      caution: 'A workload\'s `spec.selector` cannot be changed after creation. Delete the Deployment with `--cascade=orphan` to keep its pods serving while you re-create it with the new selector, or accept a short gap; never edit the pods\' labels by hand to chase the selector.',
      setup: [NSY('sel-lab'), DEPL('api', 'sel-lab', 2, '', ctr('api', 'nginx:1.25')),
        Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: api', '  namespace: sel-lab', 'spec:', '  selector:', '    app: api', '  ports:', '  - port: 80')],
      files: [{ path: '/root/api/deploy.yaml', content: Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: api', '  namespace: sel-lab', 'spec:', '  replicas: 2', '  selector:', '    matchLabels:', '      app: api', '      tier: backend', '  template:', '    metadata:', '      labels:', '        app: api', '        tier: backend', '    spec:', '      containers:', '      - name: api', '        image: nginx:1.25') }],
      tasks: [
        T('Read the refusal', ['`kubectl apply -f /root/api/deploy.yaml` and read the field it names.'], [{ t: 'exists', ref: 'svc/api', ns: 'sel-lab' }]),
        T('`api` selects on `app` and `tier`, with 2 Ready pods', ['Delete the Deployment (`--cascade=orphan` keeps the old pods serving), then apply the file.', 'Orphaned old pods stay behind: delete them once the new ones are Ready.'], [{ t: 'jp', ref: 'deploy/api', ns: 'sel-lab', path: '.spec.selector.matchLabels.tier', eq: 'backend' }, { t: 'podsReady', ns: 'sel-lab', sel: 'app=api,tier=backend', min: 2 }]),
        T('The Service `api` still has endpoints', ['The Service selects `app: api`, which the new pods carry as well.'], [{ t: 'endpoints', ns: 'sel-lab', svc: 'api', min: 2 }])
      ],
      solution: ['kubectl delete deploy api -n sel-lab --cascade=orphan', 'kubectl apply -f /root/api/deploy.yaml', 'kubectl rollout status deploy/api -n sel-lab', 'kubectl get ep api -n sel-lab'] }),

    // ── S207 immutable Pod fields ──
    L({ id: 's207-pod-immutable', num: 'S207', title: 'A bare Pod refuses the new CPU limit', diff: 'Beginner', track: ['CKAD'], domain: 'Configuration', time: '8 min', ns: 'podimm-lab',
      story: 'The standalone Pod `batch-runner` in `podimm-lab` has a CPU limit of `100m` and is being throttled. The manifest `/root/runner/pod.yaml` already says `200m`, but `kubectl apply -f` is refused: a Pod\'s resources cannot be changed in place. Get the Pod running with the `200m` limit, keeping its name.',
      caution: 'Only a few Pod fields can change in place (the image, for example). For anything else the Pod must be replaced: `kubectl replace --force` deletes and re-creates it from the file. If the pod belongs to a Deployment, edit the Deployment instead.',
      setup: [NSY('podimm-lab'), Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: batch-runner', '  namespace: podimm-lab', 'spec:', '  containers:', '  - name: runner', '    image: nginx:1.25', '    resources:', '      limits:', '        cpu: 100m')],
      files: [{ path: '/root/runner/pod.yaml', content: Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: batch-runner', '  namespace: podimm-lab', 'spec:', '  containers:', '  - name: runner', '    image: nginx:1.25', '    resources:', '      limits:', '        cpu: 200m') }],
      tasks: [
        T('Read why the apply is refused', ['`kubectl apply -f /root/runner/pod.yaml` and read which fields a Pod update may change.'], [{ t: 'exists', ref: 'pod/batch-runner', ns: 'podimm-lab' }]),
        T('`batch-runner` runs with the 200m limit', ['`kubectl replace --force -f /root/runner/pod.yaml`, or delete the pod and apply the file.'], [{ t: 'jp', ref: 'pod/batch-runner', ns: 'podimm-lab', path: '.spec.containers[0].resources.limits.cpu', eq: '200m' }, { t: 'podsReady', ns: 'podimm-lab', sel: '', min: 1 }])
      ],
      solution: ['kubectl replace --force -f /root/runner/pod.yaml', 'kubectl get pod batch-runner -n podimm-lab'] })
  ]);
  if (KL.COMP) KL.COMP.add({ 's198-topology-spread': 'cka-sched cka-pod', 's199-pv-node-affinity': 'cka-pv cka-sc', 's200-hostport-conflict': 'cka-sched cka-svc ckad-svc', 's201-requests-above-limits': 'ckad-quota cka-resources', 's202-pull-policy-never': 'ckad-image ckad-deploy', 's203-downward-api': 'ckad-cm ckad-vol', 's204-job-suspended': 'ckad-job', 's205-readonly-rootfs': 'cks-hostos cks-priv ckad-sc', 's206-immutable-selector': 'ckad-deploy cka-deploy', 's207-pod-immutable': 'ckad-deploy ckad-quota' });
})(typeof window !== 'undefined' ? window : globalThis);
