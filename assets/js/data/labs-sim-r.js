/* Labs S173–S181: CKA control-plane faults. SCRIPTED models (see sim-extras.js and the Fidelity page): the real components are not run;
   the simulator reads each static-pod manifest and behaves as the cluster would with that component down. Log lines are plausible, not byte-exact.
   Original scenarios from the public curriculum outline, not exam questions. Not mirrored on kind (a kind cluster would break), so simOnly. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js');
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); o.curriculum = true; o.simOnly = true; return o; }
  function Y() { return Array.prototype.slice.call(arguments).join('\n') + '\n'; }
  function NSY(n) { return Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: ' + n); }
  function DEP(name, ns, replicas) { return Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: ' + name, '  namespace: ' + ns, 'spec:', '  replicas: ' + replicas, '  selector:', '    matchLabels:', '      app: ' + name, '  template:', '    metadata:', '      labels:', '        app: ' + name, '    spec:', '      containers:', '      - name: c', '        image: nginx:1.25'); }
  var PKI = '/etc/kubernetes/pki/';
  function man(comp, flags, extra) {
    return Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: ' + comp, '  namespace: kube-system', '  labels:', '    component: ' + comp, '    tier: control-plane', 'spec:', '  containers:', '  - name: ' + comp, '    image: registry.k8s.io/' + comp + ':v1.31.0', '    command:', '    - ' + comp, flags.map(function (f) { return '    - ' + f; }).join('\n'), extra || '').replace(/\n\n$/, '\n');
  }
  var SCHED = ['--authentication-kubeconfig=/etc/kubernetes/scheduler.conf', '--authorization-kubeconfig=/etc/kubernetes/scheduler.conf', '--bind-address=127.0.0.1', '--kubeconfig=/etc/kubernetes/scheduler.conf', '--leader-elect=true'];
  var CM = ['--allocate-node-cidrs=true', '--authentication-kubeconfig=/etc/kubernetes/controller-manager.conf', '--authorization-kubeconfig=/etc/kubernetes/controller-manager.conf', '--bind-address=127.0.0.1', '--client-ca-file=' + PKI + 'ca.crt', '--cluster-cidr=10.244.0.0/16', '--cluster-signing-cert-file=' + PKI + 'ca.crt', '--cluster-signing-key-file=' + PKI + 'ca.key', '--controllers=*,bootstrapsigner,tokencleaner', '--kubeconfig=/etc/kubernetes/controller-manager.conf', '--leader-elect=true', '--root-ca-file=' + PKI + 'ca.crt', '--service-account-private-key-file=' + PKI + 'sa.key', '--service-cluster-ip-range=10.96.0.0/12', '--use-service-account-credentials=true'];
  var API = ['--advertise-address=10.0.0.10', '--allow-privileged=true', '--authorization-mode=Node,RBAC', '--client-ca-file=' + PKI + 'ca.crt', '--enable-admission-plugins=NodeRestriction', '--etcd-cafile=' + PKI + 'etcd/ca.crt', '--etcd-certfile=' + PKI + 'apiserver-etcd-client.crt', '--etcd-keyfile=' + PKI + 'apiserver-etcd-client.key', '--etcd-servers=https://127.0.0.1:2379', '--kubelet-client-certificate=' + PKI + 'apiserver-kubelet-client.crt', '--kubelet-client-key=' + PKI + 'apiserver-kubelet-client.key', '--secure-port=6443', '--service-account-issuer=https://kubernetes.default.svc.cluster.local', '--service-account-key-file=' + PKI + 'sa.pub', '--service-account-signing-key-file=' + PKI + 'sa.key', '--service-cluster-ip-range=10.96.0.0/12', '--tls-cert-file=' + PKI + 'apiserver.crt', '--tls-private-key-file=' + PKI + 'apiserver.key'];
  var ETCD = ['--listen-client-urls=https://127.0.0.1:2379', '--advertise-client-urls=https://127.0.0.1:2379', '--data-dir=/var/lib/etcd'];
  function F(path, c) { return { path: path, content: c || 'x' }; }
  // every file the manifests above refer to, so only the planted mistake makes a component fail
  var BASE = ['ca.crt', 'ca.key', 'sa.key', 'sa.pub', 'apiserver.crt', 'apiserver.key', 'apiserver-etcd-client.crt', 'apiserver-etcd-client.key', 'apiserver-kubelet-client.crt', 'apiserver-kubelet-client.key', 'etcd/ca.crt'].map(function (n) { return F(PKI + n); })
    .concat(['scheduler.conf', 'controller-manager.conf'].map(function (n) { return F('/etc/kubernetes/' + n); }));
  function files(over) {
    var m = { 'kube-scheduler': SCHED, 'kube-controller-manager': CM, 'kube-apiserver': API, etcd: ETCD }, k;
    for (k in over) m[k] = over[k];
    return BASE.concat(Object.keys(m).map(function (c) { return F('/etc/kubernetes/manifests/' + c + '.yaml', man(c, m[c])); }));
  }
  function swap(arr, from, to) { return arr.map(function (x) { return x === from ? to : x; }); }
  var MP = '/etc/kubernetes/manifests/';

  Labs.register([
    // ── S173 scheduler down ──
    L({ id: 's173-scheduler-down', num: 'S173', title: 'New pods stay Pending and there are no events at all', diff: 'Advanced', track: ['CKA'], domain: 'Troubleshooting', time: '12 min', ns: 'sched-lab',
      story: 'The `web` Deployment in `sched-lab` was created ten minutes ago. Its pods are `Pending`, but `kubectl describe pod` shows an empty Events section: no `FailedScheduling`, no `Scheduled`. Nodes are fine. Find out which component is not doing its job, and fix it the way you would on a real control plane.',
      caution: 'On a real control plane the scheduler is a static pod. Do not delete the mirror pod from `kubectl` (it does nothing) and keep a copy of the manifest before you edit it: a typo in a control-plane manifest takes the component down. Here the control plane is a scripted model.',
      flags: { cp: true },
      setup: [NSY('kube-system'), NSY('sched-lab'), DEP('web', 'sched-lab', 2)],
      files: files({ 'kube-scheduler': SCHED.concat(['--bind-adress=127.0.0.1']).filter(function (x) { return x !== '--bind-address=127.0.0.1'; }) }),
      tasks: [
        T('Work out why nothing is scheduling', ['`kubectl get pods -n kube-system`: is every control-plane pod Running?', 'No events means no scheduler decided anything. Look at the scheduler pod, then its logs: `kubectl logs kube-scheduler-cp1 -n kube-system`.', 'Read `/etc/kubernetes/manifests/kube-scheduler.yaml` for the flag the log complains about.'], [{ t: 'fileRe', path: MP + 'kube-scheduler.yaml', re: '--bind-address=127\\.0\\.0\\.1', msg: 'the scheduler manifest must use a valid flag name' }]),
        T('The scheduler is Running again', ['The kubelet recreates a static pod when its file changes.', '`kubectl get pod kube-scheduler-cp1 -n kube-system`'], [{ t: 'podsReady', ns: 'kube-system', sel: 'component=kube-scheduler', min: 1 }]),
        T('Both `web` pods are scheduled and Ready', ['Pending pods are picked up as soon as the scheduler is back.', '`kubectl get pods -n sched-lab -o wide`'], [{ t: 'podsReady', ns: 'sched-lab', sel: 'app=web', min: 2 }])
      ],
      solution: ['kubectl get pods -n sched-lab', 'kubectl get pods -n kube-system', 'kubectl logs kube-scheduler-cp1 -n kube-system', "sed -i 's/--bind-adress=/--bind-address=/' /etc/kubernetes/manifests/kube-scheduler.yaml", 'kubectl get pods -n sched-lab'] }),

    // ── S174 controller manager ──
    L({ id: 's174-controller-manager', num: 'S174', title: 'A Deployment creates no ReplicaSet', diff: 'Advanced', track: ['CKA'], domain: 'Troubleshooting', time: '12 min', ns: 'cm-lab',
      story: 'The Deployment `api` in `cm-lab` exists with 2 desired replicas, but `kubectl get rs` is empty and `READY` stays `0/2`. Existing pods elsewhere still run. Something that turns Deployments into ReplicaSets is not running. Find it and fix it.',
      caution: 'The controller manager runs every built-in controller. Fix the flag in its manifest, nothing else: restarting or rewriting the whole file can break leader election or certificate signing for the whole cluster.',
      flags: { cp: true },
      setup: [NSY('kube-system'), NSY('cm-lab'), DEP('api', 'cm-lab', 2)],
      files: files({ 'kube-controller-manager': swap(CM, '--cluster-signing-key-file=' + PKI + 'ca.key', '--cluster-signing-key-file=' + PKI + 'ca.keyy') }),
      tasks: [
        T('Find the component that is down and read why', ['`kubectl get pods -n kube-system`: look for a pod that is not Running.', '`kubectl logs kube-controller-manager-cp1 -n kube-system`', 'The log names a file it cannot open. Compare it with `ls /etc/kubernetes/pki`.'], [{ t: 'fileRe', path: MP + 'kube-controller-manager.yaml', re: 'cluster-signing-key-file=/etc/kubernetes/pki/ca\\.key(\\s|$)', msg: 'point the flag at the real key file' }]),
        T('The controller manager is Running', ['After the manifest is fixed the kubelet restarts the container.'], [{ t: 'podsReady', ns: 'kube-system', sel: 'component=kube-controller-manager', min: 1 }]),
        T('`api` has a ReplicaSet and 2 Ready pods', ['`kubectl get rs,pods -n cm-lab`'], [{ t: 'podsReady', ns: 'cm-lab', sel: 'app=api', min: 2 }])
      ],
      solution: ['kubectl get rs -n cm-lab', 'kubectl get pods -n kube-system', 'kubectl logs kube-controller-manager-cp1 -n kube-system', 'ls /etc/kubernetes/pki', "sed -i 's#ca.keyy#ca.key#' /etc/kubernetes/manifests/kube-controller-manager.yaml", 'kubectl get rs,pods -n cm-lab'] }),

    // ── S175 apiserver etcd url ──
    L({ id: 's175-apiserver-etcd', num: 'S175', title: 'kubectl says connection refused: the API server is down', diff: 'Advanced', track: ['CKA'], domain: 'Troubleshooting', time: '15 min', ns: 'apiserver-lab',
      story: 'Every `kubectl` command ends with `The connection to the server cp1:6443 was refused`. Someone edited the API server manifest during a maintenance window. `kubectl` cannot help you now: use the container runtime tools on the node. Bring the API server back and prove it by scaling the `shop` Deployment in `apiserver-lab` to 3 replicas.',
      caution: 'Take a copy of the manifest before editing (`cp /etc/kubernetes/manifests/kube-apiserver.yaml /root/`). A second mistake means a second outage; and never move the manifest out of the directory unless you mean to stop the API server.',
      flags: { cp: true },
      setup: [NSY('kube-system'), NSY('apiserver-lab'), DEP('shop', 'apiserver-lab', 2)],
      files: files({ 'kube-apiserver': swap(API, '--etcd-servers=https://127.0.0.1:2379', '--etcd-servers=https://127.0.0.1:2381') }),
      tasks: [
        T('Find out why the API server is not running', ['`crictl ps -a` lists containers even when the API server is down.', '`crictl logs <container id>` of the `kube-apiserver` entry (Exited).', 'The log mentions the address it cannot dial. Which port does etcd listen on? `grep listen-client /etc/kubernetes/manifests/etcd.yaml`'], [{ t: 'fileRe', path: MP + 'kube-apiserver.yaml', re: 'etcd-servers=https://127\\.0\\.0\\.1:2379', msg: '`--etcd-servers` must match the etcd client URL' }]),
        T('`kubectl` works again and the API server pod is Ready', ['Static pods are recreated by the kubelet within a few seconds.'], [{ t: 'podsReady', ns: 'kube-system', sel: 'component=kube-apiserver', min: 1 }]),
        T('Scale `shop` to 3 replicas to prove writes work', ['`kubectl scale deploy shop -n apiserver-lab --replicas=3`'], [{ t: 'podsReady', ns: 'apiserver-lab', sel: 'app=shop', min: 3 }])
      ],
      solution: ['crictl ps -a', 'crictl logs c3c383df01d18', 'grep listen-client /etc/kubernetes/manifests/etcd.yaml', "sed -i 's#127.0.0.1:2381#127.0.0.1:2379#' /etc/kubernetes/manifests/kube-apiserver.yaml", 'kubectl scale deploy shop -n apiserver-lab --replicas=3'] }),

    // ── S176 kube-proxy ──
    L({ id: 's176-kube-proxy-mode', num: 'S176', title: 'kube-proxy crash-loops after a config change', diff: 'Intermediate', track: ['CKA'], domain: 'Networking', time: '12 min', ns: 'kube-system',
      story: 'After someone edited the `kube-proxy` ConfigMap, the `kube-proxy` DaemonSet pods in `kube-system` are in `CrashLoopBackOff`. Read the logs, repair the configuration and get the DaemonSet Ready again. Do not delete the DaemonSet.',
      caution: 'kube-proxy programs the Service rules on every node. Change the ConfigMap, then restart the pods with `rollout restart`; deleting the DaemonSet removes Service routing from every node until it is recreated.',
      flags: { cp: true },
      files: files({}),
      constraint: { text: 'Do not delete the kube-proxy DaemonSet.', assert: [{ t: 'exists', ref: 'ds/kube-proxy', ns: 'kube-system' }] },
      setup: [NSY('kube-system'),
        Y('apiVersion: v1', 'kind: ConfigMap', 'metadata:', '  name: kube-proxy', '  namespace: kube-system', 'data:', '  config.conf: |', '    apiVersion: kubeproxy.config.k8s.io/v1alpha1', '    kind: KubeProxyConfiguration', '    mode: "ipvss"', '    clusterCIDR: 10.244.0.0/16'),
        Y('apiVersion: apps/v1', 'kind: DaemonSet', 'metadata:', '  name: kube-proxy', '  namespace: kube-system', 'spec:', '  selector:', '    matchLabels:', '      k8s-app: kube-proxy', '  template:', '    metadata:', '      labels:', '        k8s-app: kube-proxy', '    spec:', '      hostNetwork: true', '      containers:', '      - name: kube-proxy', '        image: registry.k8s.io/kube-proxy:v1.31.0', '        command: ["/usr/local/bin/kube-proxy", "--config=/var/lib/kube-proxy/config.conf"]')],
      tasks: [
        T('Read the kube-proxy logs and fix the mode in the ConfigMap', ['`kubectl get pods -n kube-system -l k8s-app=kube-proxy`', '`kubectl logs ds/kube-proxy -n kube-system`', 'Valid modes are `iptables`, `ipvs` and (Windows) `kernelspace`.'], [{ t: 'jpRe', ref: 'configmap/kube-proxy', ns: 'kube-system', path: '.data.config\\.conf', re: 'mode: "?(iptables|ipvs)"?(\\n|$)', msg: 'kube-proxy mode must be iptables or ipvs' }]),
        T('Every kube-proxy pod is Ready', ['Pods only read the ConfigMap at start. `kubectl rollout restart ds/kube-proxy -n kube-system` forces a new start.'], [{ t: 'podsReady', ns: 'kube-system', sel: 'k8s-app=kube-proxy', min: 5 }])
      ],
      solution: ['kubectl get pods -n kube-system -l k8s-app=kube-proxy', 'kubectl logs ds/kube-proxy -n kube-system', "kubectl get cm kube-proxy -n kube-system -o yaml | sed 's/ipvss/iptables/' | kubectl replace -f -", 'kubectl rollout restart ds/kube-proxy -n kube-system', 'kubectl get pods -n kube-system -l k8s-app=kube-proxy'] }),

    // ── S177 CNI ──
    L({ id: 's177-cni-missing', num: 'S177', title: 'Every new pod is stuck in ContainerCreating', diff: 'Advanced', track: ['CKA'], domain: 'Networking', time: '12 min', ns: 'cni-lab',
      story: 'After a node rebuild, new pods in `cni-lab` stay `ContainerCreating`. `kubectl describe` shows a sandbox error. The runtime reads `/etc/cni/net.d`; during the rebuild someone parked the one config there under another name. Restore networking for new pods without changing the workload.',
      caution: 'A CNI config applies to the whole node: a wrong file there breaks networking for every pod that starts afterwards. Check the file is valid JSON before you activate it, and keep the original name so you can roll back.',
      flags: { cp: true, cni: true },
      setup: [NSY('cni-lab'), DEP('web', 'cni-lab', 2)],
      files: files({}).concat([{ path: '/etc/cni/net.d/10-bridge.conflist.disabled', content: '{"cniVersion":"1.0.0","name":"podnet","plugins":[{"type":"bridge","bridge":"cni0","isGateway":true,"ipMasq":true,"ipam":{"type":"host-local","subnet":"10.244.0.0/24"}},{"type":"portmap","capabilities":{"portMappings":true}}]}' }]),
      tasks: [
        T('Read the pod events and find what is missing', ['`kubectl describe pod -n cni-lab`: look at the last event.', '`ls /etc/cni/net.d`: the runtime only loads files ending in `.conf`, `.conflist` or `.json`.'], [{ t: 'fileRe', path: '/etc/cni/net.d/10-bridge.conflist', re: '"cniVersion"', msg: 'put a valid CNI config in /etc/cni/net.d' }]),
        T('Both `web` pods are Ready', ['The kubelet retries the sandbox, so pods start by themselves once the config is valid.'], [{ t: 'podsReady', ns: 'cni-lab', sel: 'app=web', min: 2 }])
      ],
      solution: ['kubectl describe pods -n cni-lab', 'ls /etc/cni/net.d', 'mv /etc/cni/net.d/10-bridge.conflist.disabled /etc/cni/net.d/10-bridge.conflist', 'kubectl get pods -n cni-lab'] }),

    // ── S178 expired join token ──
    L({ id: 's178-join-token-expired', num: 'S178', title: 'The node will not join: the saved join command is a day old', diff: 'Intermediate', track: ['CKA'], domain: 'Cluster', time: '12 min', ns: 'join-lab',
      story: '`worker2` was rebuilt and is waiting to rejoin. The saved command in `/root/join.txt` fails with an invalid-or-expired token error. The node has already been removed from the cluster and reset. Join it with a valid command and confirm `web` runs 3 Ready replicas again.',
      caution: 'Join tokens are credentials that expire (24h by default): do not reuse ones from chat logs or old notes, and do not extend a token\'s lifetime to make an old command work. Create a fresh one on the control plane.',
      flags: { cp: true, tokenExpired: true },
      setup: [NSY('kube-system'), NSY('join-lab'), DEP('web', 'join-lab', 3)],
      setupCmds: ['kubectl drain worker2 --ignore-daemonsets --delete-emptydir-data --force', 'kubectl delete node worker2', "ssh worker2 'sudo kubeadm reset -f'"],
      files: files({}).concat([{ path: '/root/join.txt', content: 'kubeadm join 192.168.49.2:6443 --token abcdef.0123456789abcdef --discovery-token-ca-cert-hash sha256:7f1c0a5f9e1c3b9d2a4e6f8081726354a9b8c7d6e5f4031221b0a99887766554' }]),
      tasks: [
        T('Get a join command that is valid today', ['Try the saved command on `worker2` and read the error.', 'Tokens are created on the control plane: `ssh cp1 \'sudo kubeadm token create --print-join-command\'`.'], [{ t: 'fval', path: 'tokenFresh', eq: 'true', msg: 'create a new token on the control plane' }]),
        T('Join `worker2` and get `web` back to 3 Ready replicas', ['Run the printed command on `worker2` with sudo.', '`kubectl get nodes`'], [{ t: 'exists', ref: 'node/worker2', ns: '' }, { t: 'podsReady', ns: 'join-lab', sel: 'app=web', min: 3 }])
      ],
      solution: ["cat /root/join.txt", "ssh cp1 'sudo kubeadm token create --print-join-command'", "ssh worker2 'sudo kubeadm join 192.168.49.2:6443 --token d7k2xp.9f4s1d6h3q0w5z2c --discovery-token-ca-cert-hash sha256:7f1c0a5f9e1c3b9d2a4e6f8081726354a9b8c7d6e5f4031221b0a99887766554'", 'kubectl get nodes'] }),

    // ── S179 metrics-server ──
    L({ id: 's179-metrics-server', num: 'S179', title: '`kubectl top` says "Metrics API not available"', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '10 min', ns: 'kube-system',
      story: '`kubectl top nodes` fails with `error: Metrics API not available`, and the HPA in the cluster shows `<unknown>` targets. Find why `metrics-server` is not serving, fix it, and save the output of `kubectl top nodes` to `/root/nodes-usage.txt`.',
      caution: '`metrics-server` is a Deployment in `kube-system`. Change only what is wrong (do not delete it, and do not add `--kubelet-insecure-tls` as a shortcut: that disables certificate checks between it and every kubelet).',
      flags: { cp: true },
      constraint: { text: 'Do not delete the metrics-server Deployment.', assert: [{ t: 'exists', ref: 'deploy/metrics-server', ns: 'kube-system' }] },
      files: files({}),
      setup: [NSY('kube-system'), Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: metrics-server', '  namespace: kube-system', '  labels:', '    k8s-app: metrics-server', 'spec:', '  replicas: 1', '  strategy:', '    type: Recreate', '  selector:', '    matchLabels:', '      k8s-app: metrics-server', '  template:', '    metadata:', '      labels:', '        k8s-app: metrics-server', '    spec:', '      containers:', '      - name: metrics-server', '        image: registry.k8s.io/metrics-server/metrics-server:v0.7.1-typo')],
      tasks: [
        T('Find out why metrics-server is not Ready and fix it', ['`kubectl get pods -n kube-system -l k8s-app=metrics-server`', '`kubectl describe pod` shows the pull error; the tag does not exist (the previous release was `v0.7.1`).'], [{ t: 'podsReady', ns: 'kube-system', sel: 'k8s-app=metrics-server', min: 1 }]),
        T('Save the node usage to `/root/nodes-usage.txt`', ['`kubectl top nodes > /root/nodes-usage.txt`'], [{ t: 'fileRe', path: '/root/nodes-usage.txt', re: 'cp1\\s+\\d+m', msg: 'the file must hold real `kubectl top nodes` output' }])
      ],
      solution: ['kubectl get pods -n kube-system -l k8s-app=metrics-server', 'kubectl set image deploy/metrics-server metrics-server=registry.k8s.io/metrics-server/metrics-server:v0.7.1 -n kube-system', 'kubectl rollout status deploy/metrics-server -n kube-system', 'kubectl top nodes > /root/nodes-usage.txt'] }),

    // ── S180 default StorageClass ──
    L({ id: 's180-no-default-sc', num: 'S180', title: 'A PVC without a class stays Pending: no default StorageClass', diff: 'Intermediate', track: ['CKA'], domain: 'Storage', time: '10 min', ns: 'sc-lab',
      story: 'Teams create PVCs without a `storageClassName` and expect dynamic provisioning. Since a clean-up, the claim `data` in `sc-lab` stays `Pending` with the event "no storage class is set". The cluster has two StorageClasses, `standard` and `fast`. Make `standard` the default again, without editing the claim, and get the `app` pod Running.',
      caution: 'Exactly one StorageClass should be the default: two defaults make a claim without a class ambiguous. Also note that a class cannot be assigned to an existing claim after creation, so fix the cluster, not the PVC.',
      flags: { cp: true }, setupCmds: ['kubectl annotate sc standard storageclass.kubernetes.io/is-default-class-'],
      constraint: { text: 'Do not delete either StorageClass.', assert: [{ t: 'exists', ref: 'sc/standard', ns: '' }, { t: 'exists', ref: 'sc/fast', ns: '' }] },
      files: files({}),
      setup: [NSY('kube-system'), NSY('sc-lab'),
        Y('apiVersion: storage.k8s.io/v1', 'kind: StorageClass', 'metadata:', '  name: standard', 'provisioner: rancher.io/local-path', 'volumeBindingMode: WaitForFirstConsumer'),
        Y('apiVersion: storage.k8s.io/v1', 'kind: StorageClass', 'metadata:', '  name: fast', 'provisioner: rancher.io/local-path', 'volumeBindingMode: WaitForFirstConsumer'),
        Y('apiVersion: v1', 'kind: PersistentVolumeClaim', 'metadata:', '  name: data', '  namespace: sc-lab', 'spec:', '  accessModes: [ReadWriteOnce]', '  resources:', '    requests:', '      storage: 1Gi'),
        Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: app', '  namespace: sc-lab', '  labels:', '    app: app', 'spec:', '  containers:', '  - name: c', '    image: nginx:1.25', '    volumeMounts:', '    - name: d', '      mountPath: /data', '  volumes:', '  - name: d', '    persistentVolumeClaim:', '      claimName: data')],
      tasks: [
        T('Find which StorageClass is the default (and that none is)', ['`kubectl get sc`: the default carries `(default)` after its name.', 'The marker is the annotation `storageclass.kubernetes.io/is-default-class: "true"`.'], [{ t: 'jp', ref: 'sc/standard', ns: '', path: '.metadata.annotations.storageclass\\.kubernetes\\.io/is-default-class', eq: 'true', msg: '`standard` must carry the default-class annotation' }]),
        T('`data` is Bound and `app` is Running', ['The claim was created without a class; once a default exists the binder picks it up.', '`kubectl get pvc,pod -n sc-lab`'], [{ t: 'podsReady', ns: 'sc-lab', sel: 'app=app', min: 1 }])
      ],
      solution: ['kubectl get sc', "kubectl annotate sc standard storageclass.kubernetes.io/is-default-class=true", 'kubectl get pvc,pod -n sc-lab'] }),

    // ── S181 etcd NOSPACE ──
    L({ id: 's181-etcd-nospace', num: 'S181', title: 'Writes fail with "database space exceeded"', diff: 'Advanced', track: ['CKA'], domain: 'Troubleshooting', time: '15 min', ns: 'etcd-lab',
      story: 'Reads work, but every create, apply or delete fails with `etcdserver: mvcc: database space exceeded`. etcd has hit its storage quota and raised a NOSPACE alarm. Free the space the supported way and clear the alarm so the cluster accepts writes again. Prove it by creating the ConfigMap `ok` in `etcd-lab`.',
      caution: 'Never delete files under the etcd data directory. The order matters: compaction drops old revisions, defragmentation gives the space back to the disk, and only then can the alarm be disarmed. On a real cluster do this one member at a time and take a snapshot first.',
      flags: { cp: true, etcdDb: { rev: 48210, compacted: 0, size: 2147483648, alarm: true } },
      setup: [NSY('kube-system'), NSY('etcd-lab')],
      files: files({}),
      tasks: [
        T('Read the current revision and the alarm', ['`etcdctl endpoint status --write-out=json` shows `revision` and `dbSize`.', '`etcdctl alarm list`'], [{ t: 'fval', path: 'etcdDb.compacted', eq: 48210, msg: 'compact up to the current revision first' }]),
        T('Defragment and clear the alarm', ['`etcdctl defrag` shrinks the file only after compaction.', '`etcdctl alarm disarm` is refused while the database is still over quota.'], [{ t: 'fval', path: 'etcdDb.alarm', eq: false, msg: 'the NOSPACE alarm must be cleared' }]),
        T('Create the ConfigMap `ok` in `etcd-lab`', ['`kubectl create configmap ok -n etcd-lab --from-literal=a=b`'], [{ t: 'exists', ref: 'cm/ok', ns: 'etcd-lab' }])
      ],
      solution: ['etcdctl endpoint status --write-out=json', 'etcdctl alarm list', 'etcdctl compact 48210', 'etcdctl defrag', 'etcdctl alarm disarm', 'kubectl create configmap ok -n etcd-lab --from-literal=a=b'] })
  ]);
  if (KL.COMP) KL.COMP.add({ 's173-scheduler-down': 'cka-cp cka-sched', 's174-controller-manager': 'cka-cp cka-deploy', 's175-apiserver-etcd': 'cka-cp cka-etcd', 's176-kube-proxy-mode': 'cka-cp cka-net', 's177-cni-missing': 'cka-cni cka-net', 's178-join-token-expired': 'cka-kubeadm cka-node', 's179-metrics-server': 'ckad-metrics cka-hpa', 's180-no-default-sc': 'cka-sc cka-pv', 's181-etcd-nospace': 'cka-etcd cka-cp' });
})(typeof window !== 'undefined' ? window : globalThis);
