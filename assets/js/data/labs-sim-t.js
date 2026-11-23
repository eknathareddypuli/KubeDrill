/* Labs S190–S197: CKS hardening skills (kubelet config, file permissions and ownership, an image-registry admission policy, seccomp Localhost,
   AppArmor profiles that must be loaded, two Falco rules, secrets hygiene). Original scenarios from the public curriculum outline.
   SCRIPTED: file modes, profile loading and Falco rules are checked as files and modelled state; there is no kernel, no Falco engine and no real
   kube-bench. Marked simOnly: verified in the simulator, not on a real cluster. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js');
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); o.curriculum = true; o.simOnly = true; return o; }
  function Y() { return Array.prototype.slice.call(arguments).join('\n') + '\n'; }
  function NSY(n) { return Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: ' + n); }
  function POD(name, ns, image, spec) { return Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: ' + name, '  namespace: ' + ns, '  labels:', '    app: ' + name, 'spec:', spec || '', '  containers:', '  - name: c', '    image: ' + image, spec ? '' : '').replace(/\n\n+/g, '\n'); }

  var KUBELET = Y('apiVersion: kubelet.config.k8s.io/v1beta1', 'kind: KubeletConfiguration', 'authentication:', '  anonymous:', '    enabled: true', '  webhook:', '    enabled: false', '  x509:', '    clientCAFile: /etc/kubernetes/pki/ca.crt', 'authorization:', '  mode: AlwaysAllow', 'readOnlyPort: 10255', 'clusterDNS:', '- 10.96.0.10', 'clusterDomain: cluster.local', 'cgroupDriver: systemd');
  var BENCH = Y('[FAIL] 1.1.2 Ensure that the API server pod specification file permissions are set to 600 or more restrictive', '[FAIL] 1.1.12 Ensure that the etcd data directory ownership is set to etcd:etcd', '[FAIL] 4.1.1 Ensure that the kubelet service file permissions are set to 600 or more restrictive', '[FAIL] 4.1.5 Ensure that the --kubeconfig kubelet.conf file permissions are set to 600 or more restrictive', '[PASS] 1.1.1 Ensure that the API server pod specification file ownership is set to root:root', '== Summary master == 4 checks FAIL, 1 checks PASS');
  var FALCO_SHADOW = Y('- rule: Read sensitive file', '  desc: some file was read', '  condition: open_read and fd.name startswith /etc', '  output: file read (file=%fd.name)', '  priority: INFO');
  var FALCO_NET = Y('- rule: Outbound connection', '  desc: network', '  condition: evt.type = connect', '  output: connection (%fd.name)', '  priority: DEBUG');
  var APP_PROFILE = Y('#include <tunables/global>', 'profile k8s-deny-write flags=(attach_disconnected) {', '  #include <abstractions/base>', '  file,', '  deny /** w,', '}');
  var SECCOMP = '{"defaultAction":"SCMP_ACT_ALLOW","syscalls":[{"names":["chmod","fchmod","fchmodat"],"action":"SCMP_ACT_ERRNO"}]}';

  Labs.register([
    // ── S190 kubelet hardening ──
    L({ id: 's190-kubelet-hardening', num: 'S190', title: 'Harden the kubelet: no anonymous access, no AlwaysAllow, no read-only port', diff: 'Advanced', track: ['CKS'], domain: 'Cluster Hardening', time: '12 min', ns: 'default',
      story: 'A node audit found the kubelet on `worker1` accepts **anonymous** requests, authorizes **everything**, and serves an unauthenticated **read-only port**. Fix `/var/lib/kubelet/config.yaml`: anonymous auth off, webhook authentication on, authorization mode `Webhook`, read-only port disabled. Keep the client CA and the DNS settings as they are.',
      caution: 'A wrong kubelet config can make the node `NotReady`: the control plane must still be able to authenticate to the kubelet (webhook authentication and the CA file), so change one block at a time, keep a backup, and restart the kubelet only after you have read the file back. Restarting is not simulated here; this lab checks the file.',
      flags: {},
      files: [{ path: '/var/lib/kubelet/config.yaml', content: KUBELET }],
      constraint: { text: 'Keep the x509 client CA and the cluster DNS settings.', assert: [{ t: 'fileRe', path: '/var/lib/kubelet/config.yaml', re: 'clientCAFile: /etc/kubernetes/pki/ca\\.crt' }, { t: 'fileRe', path: '/var/lib/kubelet/config.yaml', re: 'clusterDomain: cluster\\.local' }] },
      tasks: [
        T('Anonymous requests are off and webhook authentication is on', ['`authentication.anonymous.enabled: false`', '`authentication.webhook.enabled: true`'], [{ t: 'fileRe', path: '/var/lib/kubelet/config.yaml', re: 'anonymous:\\s*\\n\\s*enabled:\\s*false' }, { t: 'fileRe', path: '/var/lib/kubelet/config.yaml', re: 'webhook:\\s*\\n\\s*enabled:\\s*true' }]),
        T('Authorization is `Webhook` and the read-only port is closed', ['`authorization.mode: Webhook` delegates decisions to the API server.', '`readOnlyPort: 0` disables the port.'], [{ t: 'fileRe', path: '/var/lib/kubelet/config.yaml', re: 'authorization:\\s*\\n\\s*mode:\\s*Webhook' }, { t: 'fileRe', path: '/var/lib/kubelet/config.yaml', re: 'readOnlyPort:\\s*0\\s*$', flags: 'm' }])
      ],
      solution: ["cat > /var/lib/kubelet/config.yaml <<'EOF'\napiVersion: kubelet.config.k8s.io/v1beta1\nkind: KubeletConfiguration\nauthentication:\n  anonymous:\n    enabled: false\n  webhook:\n    enabled: true\n  x509:\n    clientCAFile: /etc/kubernetes/pki/ca.crt\nauthorization:\n  mode: Webhook\nreadOnlyPort: 0\nclusterDNS:\n- 10.96.0.10\nclusterDomain: cluster.local\ncgroupDriver: systemd\nEOF"] }),

    // ── S191 kube-bench permissions ──
    L({ id: 's191-bench-permissions', num: 'S191', title: 'kube-bench FAILs: fix file permissions and ownership', diff: 'Intermediate', track: ['CKS'], domain: 'System Hardening', time: '12 min', ns: 'default',
      story: 'The report `/root/kube-bench.txt` lists four FAILs on the control-plane node, all about files: the API server manifest and the kubelet `kubelet.conf` and service file are too open, and the etcd data directory is not owned by `etcd:etcd`. Fix them with the smallest change that satisfies each check (600 or more restrictive; owner `etcd:etcd`), without changing the content of any file.',
      caution: 'Do not `chmod 777` or `chmod -R` the whole of `/etc/kubernetes`: that is the opposite of the finding. Change exactly the files named, check with `stat -c \'%a %U:%G\' <path>`, and re-run the benchmark. Real kube-bench is not simulated: the report is a fixed file.',
      flags: { fmeta: { '/etc/kubernetes/manifests/kube-apiserver.yaml': { mode: '644', owner: 'root:root' }, '/etc/kubernetes/kubelet.conf': { mode: '664', owner: 'root:root' }, '/etc/systemd/system/kubelet.service.d/10-kubeadm.conf': { mode: '644', owner: 'root:root' }, '/var/lib/etcd': { mode: '700', owner: 'root:root' } } },
      files: [{ path: '/root/kube-bench.txt', content: BENCH }, { path: '/etc/kubernetes/manifests/kube-apiserver.yaml', content: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: kube-apiserver\n' }, { path: '/etc/kubernetes/kubelet.conf', content: 'apiVersion: v1\nkind: Config\n' }, { path: '/etc/systemd/system/kubelet.service.d/10-kubeadm.conf', content: '[Service]\nExecStart=/usr/bin/kubelet\n' }, { path: '/var/lib/etcd/member/snap/db', content: 'x' }],
      constraint: { text: 'The files must keep their content.', assert: [{ t: 'fileRe', path: '/etc/kubernetes/manifests/kube-apiserver.yaml', re: 'name: kube-apiserver' }, { t: 'fileRe', path: '/etc/kubernetes/kubelet.conf', re: 'kind: Config' }] },
      tasks: [
        T('The API server manifest is 600 or stricter (check 1.1.2)', ['`stat -c \'%a %U:%G\' /etc/kubernetes/manifests/kube-apiserver.yaml`', '`chmod 600 <file>`'], [{ t: 'fmode', path: '/etc/kubernetes/manifests/kube-apiserver.yaml', max: '600', owner: 'root:root' }]),
        T('The two kubelet files are 600 or stricter (checks 4.1.1 and 4.1.5)', ['The service file is a systemd drop-in under `/etc/systemd/system/kubelet.service.d/`.'], [{ t: 'fmode', path: '/etc/systemd/system/kubelet.service.d/10-kubeadm.conf', max: '600' }, { t: 'fmode', path: '/etc/kubernetes/kubelet.conf', max: '600' }]),
        T('The etcd data directory is owned by `etcd:etcd` (check 1.1.12)', ['`chown -R etcd:etcd /var/lib/etcd`', 'Check with `ls -ld /var/lib/etcd`.'], [{ t: 'fmode', path: '/var/lib/etcd', max: '700', owner: 'etcd:etcd' }, { t: 'fmode', path: '/var/lib/etcd/member/snap/db', owner: 'etcd:etcd' }])
      ],
      solution: ['cat /root/kube-bench.txt', "stat -c '%a %U:%G' /etc/kubernetes/manifests/kube-apiserver.yaml /etc/kubernetes/kubelet.conf", 'chmod 600 /etc/kubernetes/manifests/kube-apiserver.yaml', 'chmod 600 /etc/kubernetes/kubelet.conf /etc/systemd/system/kubelet.service.d/10-kubeadm.conf', 'chown -R etcd:etcd /var/lib/etcd', 'ls -ld /var/lib/etcd'] }),

    // ── S192 image registry policy ──
    L({ id: 's192-registry-policy', num: 'S192', title: 'Only images from the internal registry: a ValidatingAdmissionPolicy', diff: 'Advanced', track: ['CKS'], domain: 'Supply Chain Security', time: '15 min', ns: 'reg-lab',
      story: 'Policy: pods in namespaces labelled `registry-policy=enforced` may only use images from `registry.example.com/`. Write a **ValidatingAdmissionPolicy** (CEL) named `internal-registry-only` and a **binding** that enforces it with `Deny` in those namespaces. Namespace `reg-lab` is labelled. Prove it: a pod using `docker.io/library/nginx:1.25` is rejected and a pod `web-ok` using `registry.example.com/team/web:1.0` is admitted.',
      caution: 'A policy with no binding does nothing, and a binding with action `Audit` only logs. Deny rules can also block system pods: scope the binding with a namespace selector and test both a violating and a compliant pod before you rely on it.',
      setup: [Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: reg-lab', '  labels:', '    registry-policy: enforced')],
      tasks: [
        T('Create the policy and its Deny binding', ['`kubectl explain validatingadmissionpolicy.spec.validations`', 'CEL: `object.spec.containers.all(c, c.image.startsWith("registry.example.com/"))`', 'The binding needs `policyName`, `validationActions: [Deny]` and a `matchResources.namespaceSelector`.'], [{ t: 'jpRe', ref: 'validatingadmissionpolicy/internal-registry-only', ns: '', path: '.spec.validations[0].expression', re: 'startsWith\\(.registry\\.example\\.com/' }, { t: 'jpRe', ref: 'validatingadmissionpolicybinding/internal-registry-only', ns: '', path: '.spec.validationActions', re: 'Deny' }]),
        T('A pod from the compliant registry is admitted', ['`kubectl run web-ok -n reg-lab --image=registry.example.com/team/web:1.0`'], [{ t: 'exists', ref: 'pod/web-ok', ns: 'reg-lab' }]),
        T('A pod from Docker Hub is rejected (no pod `rogue` exists)', ['`kubectl run rogue -n reg-lab --image=docker.io/library/nginx:1.25` must fail with a denied message.'], [{ t: 'absent', ref: 'pod/rogue', ns: 'reg-lab' }, { t: 'jpRe', ref: 'validatingadmissionpolicybinding/internal-registry-only', ns: '', path: '.spec.policyName', re: '^internal-registry-only$' }])
      ],
      solution: [`kubectl apply -f - <<'EOF'
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: internal-registry-only
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  - expression: "object.spec.containers.all(c, c.image.startsWith('registry.example.com/'))"
    message: "images must come from registry.example.com"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: internal-registry-only
spec:
  policyName: internal-registry-only
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchLabels:
        registry-policy: enforced
EOF`, 'kubectl run web-ok -n reg-lab --image=registry.example.com/team/web:1.0'] }),

    // ── S193 seccomp localhost ──
    L({ id: 's193-seccomp-localhost', num: 'S193', title: 'A pod with a Localhost seccomp profile will not start', diff: 'Advanced', track: ['CKS'], domain: 'System Hardening', time: '12 min', ns: 'sec-lab',
      story: 'The pod `locked` in `sec-lab` asks for the seccomp profile `profiles/block-chmod.json` (type `Localhost`) and stays in `CreateContainerConfigError`. The profile exists in `/root/profiles/block-chmod.json` but was never installed on the node. Install it where the kubelet looks for it and get the pod Running with the profile still enforced.',
      caution: 'Switching the pod to `Unconfined`, or to `RuntimeDefault`, would "fix" the error by dropping the hardening you were asked to keep. The kubelet resolves `localhostProfile` relative to `/var/lib/kubelet/seccomp/` on the node where the pod runs (on a multi-node cluster the file must exist on every candidate node).',
      setup: [NSY('sec-lab'), POD('locked', 'sec-lab', 'nginx:1.25', '  securityContext:\n    seccompProfile:\n      type: Localhost\n      localhostProfile: profiles/block-chmod.json')],
      files: [{ path: '/root/profiles/block-chmod.json', content: SECCOMP }],
      constraint: { text: 'The pod keeps its Localhost seccomp profile.', assert: [{ t: 'jp', ref: 'pod/locked', ns: 'sec-lab', path: '.spec.securityContext.seccompProfile.type', eq: 'Localhost' }, { t: 'jp', ref: 'pod/locked', ns: 'sec-lab', path: '.spec.securityContext.seccompProfile.localhostProfile', eq: 'profiles/block-chmod.json' }] },
      tasks: [
        T('Install the profile under the kubelet seccomp directory', ['`kubectl describe pod locked -n sec-lab` names the path that cannot be opened.', 'The directory is `/var/lib/kubelet/seccomp/`; keep the `profiles/` sub-path from the pod spec.'], [{ t: 'fileRe', path: '/var/lib/kubelet/seccomp/profiles/block-chmod.json', re: 'SCMP_ACT_ERRNO', msg: 'the profile must be installed at the path the pod asks for' }]),
        T('`locked` is Running', ['The kubelet retries the container start by itself.'], [{ t: 'podsReady', ns: 'sec-lab', sel: 'app=locked', min: 1 }])
      ],
      solution: ['kubectl describe pod locked -n sec-lab', 'mkdir -p /var/lib/kubelet/seccomp/profiles', 'cp /root/profiles/block-chmod.json /var/lib/kubelet/seccomp/profiles/block-chmod.json', 'kubectl get pod locked -n sec-lab'] }),

    // ── S194 apparmor not loaded ──
    L({ id: 's194-apparmor-load', num: 'S194', title: 'AppArmor profile named in the pod but not loaded on the node', diff: 'Advanced', track: ['CKS'], domain: 'System Hardening', time: '12 min', ns: 'aa-lab',
      story: 'The pod `writer` in `aa-lab` uses `appArmorProfile` type `Localhost` with the profile `k8s-deny-write`, and it never starts. The profile text is in `/etc/apparmor.d/k8s-deny-write`. Load it into the kernel on the node, confirm it is listed, and get the pod Running with the profile still attached.',
      caution: 'Removing the profile field from the pod gets it running with no confinement at all. Profiles are loaded per node (and are lost on reboot unless they are in `/etc/apparmor.d` and loaded at boot). Real kernel enforcement is not simulated; load state is modelled.',
      setup: [NSY('aa-lab'), Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: writer', '  namespace: aa-lab', '  labels:', '    app: writer', 'spec:', '  containers:', '  - name: c', '    image: nginx:1.25', '    securityContext:', '      appArmorProfile:', '        type: Localhost', '        localhostProfile: k8s-deny-write')],
      files: [{ path: '/etc/apparmor.d/k8s-deny-write', content: APP_PROFILE }],
      constraint: { text: 'The pod keeps its AppArmor profile.', assert: [{ t: 'jp', ref: 'pod/writer', ns: 'aa-lab', path: '.spec.containers[0].securityContext.appArmorProfile.localhostProfile', eq: 'k8s-deny-write' }] },
      tasks: [
        T('Load `k8s-deny-write` on the node', ['`aa-status` lists the loaded profiles.', '`apparmor_parser -r /etc/apparmor.d/k8s-deny-write`'], [{ t: 'fval', path: 'aaLoaded.k8s-deny-write', eq: 'enforce', msg: 'the profile must be loaded in enforce mode' }]),
        T('`writer` is Running', ['After the profile is loaded the kubelet starts the container.'], [{ t: 'podsReady', ns: 'aa-lab', sel: 'app=writer', min: 1 }])
      ],
      solution: ['aa-status', 'apparmor_parser -r /etc/apparmor.d/k8s-deny-write', 'aa-status', 'kubectl get pod writer -n aa-lab'] }),

    // ── S195 falco shadow ──
    L({ id: 's195-falco-shadow', num: 'S195', title: 'Falco: alert when a container reads /etc/shadow', diff: 'Advanced', track: ['CKS'], domain: 'Monitoring & Runtime Security', time: '12 min', ns: 'default',
      story: 'The rule in `/home/student/falco_shadow.yaml` fires on any read under `/etc` (hundreds of alerts a minute) and its priority is `INFO`. Rewrite it so it fires only when a process **inside a container** opens `/etc/shadow` or `/etc/gshadow` for reading, names the container, the process and the user in the output, and has priority `WARNING` or higher.',
      caution: 'Use the shipped macros (`open_read`, `container`) rather than raw event types, and match the exact file names: a prefix match on `/etc` is why the rule is noisy. Rules are checked as text; no Falco engine runs here.',
      setup: [], files: [{ path: '/home/student/falco_shadow.yaml', content: FALCO_SHADOW }],
      tasks: [
        T('The condition is a container read of the two shadow files only', ['`condition:` should contain `open_read`, `container` and `fd.name in (/etc/shadow, /etc/gshadow)`.', 'Remove the `startswith /etc` clause.'], [{ t: 'fileRe', path: '/home/student/falco_shadow.yaml', re: '^\\s*condition:.*open_read', flags: 'm' }, { t: 'fileRe', path: '/home/student/falco_shadow.yaml', re: '^\\s*condition:.*\\bcontainer\\b', flags: 'm' }, { t: 'fileRe', path: '/home/student/falco_shadow.yaml', re: '^\\s*condition:.*/etc/shadow', flags: 'm' }, { t: 'fileNo', path: '/home/student/falco_shadow.yaml', re: 'startswith\\s+/etc\\b' }]),
        T('The alert names container, process and user, at WARNING or higher', ['Fields: `%container.name`, `%proc.name`, `%user.name`.', 'Priorities: DEBUG INFO NOTICE WARNING ERROR CRITICAL ALERT EMERGENCY.'], [{ t: 'fileRe', path: '/home/student/falco_shadow.yaml', re: '^\\s*output:.*%container\\.name', flags: 'm' }, { t: 'fileRe', path: '/home/student/falco_shadow.yaml', re: '^\\s*output:.*%proc\\.name', flags: 'm' }, { t: 'fileRe', path: '/home/student/falco_shadow.yaml', re: '^\\s*output:.*%user\\.name', flags: 'm' }, { t: 'fileRe', path: '/home/student/falco_shadow.yaml', re: '^\\s*priority:\\s*(WARNING|ERROR|CRITICAL|ALERT|EMERGENCY)\\s*$', flags: 'm' }])
      ],
      solution: ["cat > /home/student/falco_shadow.yaml <<'EOF'\n- rule: Read shadow file in container\n  desc: A process in a container opened a password hash file for reading\n  condition: open_read and container and fd.name in (/etc/shadow, /etc/gshadow)\n  output: shadow file read (container=%container.name proc=%proc.name user=%user.name file=%fd.name)\n  priority: WARNING\nEOF"] }),

    // ── S196 falco outbound ──
    L({ id: 's196-falco-outbound', num: 'S196', title: 'Falco: alert on unexpected outbound connections from containers', diff: 'Advanced', track: ['CKS'], domain: 'Monitoring & Runtime Security', time: '12 min', ns: 'default',
      story: 'The rule in `/home/student/falco_outbound.yaml` matches every `connect` event on the host, priority `DEBUG`. Make it useful: alert only for **outbound** connections made by a process inside a container to an address that is **not** in the cluster and not the loopback, with the container, process and destination in the output, at `NOTICE` or higher.',
      caution: 'A rule that alerts on everything is ignored; one that excludes too much misses the exfiltration. Use the shipped macros (`outbound`, `container`) and exclude only what the story names. Rules are checked as text; no Falco engine runs here.',
      setup: [], files: [{ path: '/home/student/falco_outbound.yaml', content: FALCO_NET }],
      tasks: [
        T('Condition: outbound, in a container, not to the cluster or loopback', ['Use `outbound and container`.', 'Exclude with `not fd.snet in (10.0.0.0/8, 127.0.0.0/8)` or `not fd.sip.name = localhost`-style clauses: it must contain a `not`.'], [{ t: 'fileRe', path: '/home/student/falco_outbound.yaml', re: '^\\s*condition:.*\\boutbound\\b', flags: 'm' }, { t: 'fileRe', path: '/home/student/falco_outbound.yaml', re: '^\\s*condition:.*\\bcontainer\\b', flags: 'm' }, { t: 'fileRe', path: '/home/student/falco_outbound.yaml', re: '^\\s*condition:.*\\bnot\\b.*(10\\.0\\.0\\.0/8|127\\.0\\.0\\.0/8|10\\.|127\\.)', flags: 'm' }, { t: 'fileNo', path: '/home/student/falco_outbound.yaml', re: 'evt\\.type\\s*=\\s*connect\\s*$', flags: 'm' }]),
        T('Output names container, process and destination; priority NOTICE or higher', ['`%container.name`, `%proc.name`, `%fd.name`.'], [{ t: 'fileRe', path: '/home/student/falco_outbound.yaml', re: '^\\s*output:.*%container\\.name', flags: 'm' }, { t: 'fileRe', path: '/home/student/falco_outbound.yaml', re: '^\\s*output:.*%proc\\.name', flags: 'm' }, { t: 'fileRe', path: '/home/student/falco_outbound.yaml', re: '^\\s*output:.*%fd\\.name', flags: 'm' }, { t: 'fileRe', path: '/home/student/falco_outbound.yaml', re: '^\\s*priority:\\s*(NOTICE|WARNING|ERROR|CRITICAL|ALERT|EMERGENCY)\\s*$', flags: 'm' }])
      ],
      solution: ["cat > /home/student/falco_outbound.yaml <<'EOF'\n- rule: Unexpected outbound connection\n  desc: A container opened a connection to an address outside the cluster\n  condition: outbound and container and not fd.snet in (10.0.0.0/8, 127.0.0.0/8)\n  output: outbound connection (container=%container.name proc=%proc.name dest=%fd.name)\n  priority: NOTICE\nEOF"] }),

    // ── S197 secrets hygiene ──
    L({ id: 's197-secret-in-configmap', num: 'S197', title: 'A password was committed in a ConfigMap', diff: 'Intermediate', track: ['CKS', 'CKAD'], domain: 'Minimize Microservice Vulnerabilities', time: '15 min', ns: 'secret-lab',
      story: 'The ConfigMap `app-config` in `secret-lab` holds `DB_PASSWORD=hunter2` next to harmless settings, and the Deployment `api` reads it with `envFrom`. A ConfigMap is not secret storage (it is readable by anyone who can read the namespace and is often committed to git). Move the password to a Secret named `db-credentials`, **rotate it to a new value** (the old one has leaked), remove it from the ConfigMap, and make `api` read it from the Secret. The other settings must keep working.',
      caution: 'Moving the same value into a Secret does not undo the leak: rotate it. Secrets are only base64-encoded, so also check who can `get secrets` and whether encryption at rest is on. Never put the real value in a command that ends up in shell history of a shared host.',
      setup: [NSY('secret-lab'),
        Y('apiVersion: v1', 'kind: ConfigMap', 'metadata:', '  name: app-config', '  namespace: secret-lab', 'data:', '  LOG_LEVEL: info', '  DB_HOST: db.secret-lab.svc', '  DB_PASSWORD: hunter2'),
        Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: api', '  namespace: secret-lab', 'spec:', '  replicas: 1', '  selector:', '    matchLabels:', '      app: api', '  template:', '    metadata:', '      labels:', '        app: api', '    spec:', '      containers:', '      - name: c', '        image: nginx:1.25', '        envFrom:', '        - configMapRef:', '            name: app-config')],
      constraint: { text: 'Keep `LOG_LEVEL` and `DB_HOST` working from the ConfigMap.', assert: [{ t: 'jp', ref: 'configmap/app-config', ns: 'secret-lab', path: '.data.LOG_LEVEL', eq: 'info' }, { t: 'jp', ref: 'configmap/app-config', ns: 'secret-lab', path: '.data.DB_HOST', eq: 'db.secret-lab.svc' }] },
      tasks: [
        T('The password is gone from the ConfigMap', ['Replace the ConfigMap data without the key: `kubectl get cm app-config -o yaml`, edit, `replace`.', 'Or `kubectl patch cm app-config --type=json -p \'[{"op":"remove","path":"/data/DB_PASSWORD"}]\'`.'], [{ t: 'jpRe', ref: 'configmap/app-config', ns: 'secret-lab', path: '.data', re: '^(?![\\s\\S]*hunter2)', msg: 'the leaked value must not remain in the ConfigMap' }, { t: 'jpRe', ref: 'configmap/app-config', ns: 'secret-lab', path: '.data.DB_HOST', re: 'db' }]),
        T('A Secret `db-credentials` holds a NEW password', ['`kubectl create secret generic db-credentials -n secret-lab --from-literal=DB_PASSWORD=<new value>`', 'The new value must differ from `hunter2`.'], [{ t: 'exists', ref: 'secret/db-credentials', ns: 'secret-lab' }, { t: 'jpRe', ref: 'secret/db-credentials', ns: 'secret-lab', path: '.data.DB_PASSWORD', re: '^(?!aHVudGVyMg==$).+', msg: 'rotate it: the new value must differ from the leaked one' }]),
        T('`api` reads the password from the Secret and is Ready', ['Add `env` with `valueFrom.secretKeyRef` (name `db-credentials`, key `DB_PASSWORD`), keep `envFrom` for the ConfigMap.'], [{ t: 'jp', ref: 'deploy/api', ns: 'secret-lab', path: '.spec.template.spec.containers[0].env[0].valueFrom.secretKeyRef.name', eq: 'db-credentials' }, { t: 'podsReady', ns: 'secret-lab', sel: 'app=api', min: 1 }])
      ],
      solution: [`kubectl patch cm app-config -n secret-lab --type=json -p '[{"op":"remove","path":"/data/DB_PASSWORD"}]'`, 'kubectl create secret generic db-credentials -n secret-lab --from-literal=DB_PASSWORD=N3w-r0tated-pw', `kubectl patch deploy api -n secret-lab --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/env","value":[{"name":"DB_PASSWORD","valueFrom":{"secretKeyRef":{"name":"db-credentials","key":"DB_PASSWORD"}}}]}]'`, 'kubectl rollout status deploy/api -n secret-lab'] })
  ]);
  if (KL.COMP) KL.COMP.add({ 's190-kubelet-hardening': 'cks-cis cks-hostos', 's191-bench-permissions': 'cks-cis cks-hostos', 's192-registry-policy': 'cks-vap cks-supply', 's193-seccomp-localhost': 'cks-seccomp cks-runtime', 's194-apparmor-load': 'cks-apparmor cks-hostos', 's195-falco-shadow': 'cks-runtime', 's196-falco-outbound': 'cks-runtime', 's197-secret-in-configmap': 'cks-secrets ckad-secret' });
})(typeof window !== 'undefined' ? window : globalThis);
