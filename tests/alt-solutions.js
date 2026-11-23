// Alternative-solution tests: a lab checker must accept ANY correct fix (imperative, patch, apply, replace, other valid values)
// and reject near-misses (right idea, wrong place). Each case starts from a freshly broken lab.
const Sim = require('../assets/js/sim.js'); ['sim-shell', 'sim-kubectl', 'sim-kubectl2', 'sim-kubectl3', 'sim-faults', 'sim-faults2', 'sim-extras','sim-csr','sim-explain'].forEach(f => require('../assets/js/' + f + '.js'));
const Labs = require('../assets/js/labs-engine.js'), fs = require('fs'), path = require('path');
for (const f of fs.readdirSync(path.join(__dirname, '../assets/js/data')).filter(x => /^labs-sim-.*\.js$/.test(x)).sort()) require('../assets/js/data/' + f);
const C = [];
const pass = (id, name, cmds) => C.push({ id, name, cmds, expect: true }), fail = (id, name, cmds) => C.push({ id, name, cmds, expect: false });
const J = (o) => "'" + JSON.stringify(o) + "'";
// s01: pending (CPU request too big)
pass('s01-pending-cpu', 'patch container resources', ['kubectl patch deployment api -n payments -p ' + J({ spec: { template: { spec: { containers: [{ name: 'api', resources: { requests: { cpu: '200m', memory: '64Mi' } } }] } } } })]);
pass('s01-pending-cpu', 'different valid size', ['kubectl set resources deployment/api -n payments --requests=cpu=50m,memory=32Mi']);
fail('s01-pending-cpu', 'near miss: wrong namespace', ['kubectl set resources deployment/api -n default --requests=cpu=100m,memory=64Mi']);
// s02: bad image tag
pass('s02-imagepull', 'patch image', ['kubectl patch deployment web -n shop -p ' + J({ spec: { template: { spec: { containers: [{ name: 'web', image: 'nginx:1.24' }] } } } })]);
pass('s02-imagepull', 'apply a full manifest', ["kubectl apply -f - <<'EOF'\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\n  namespace: shop\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: web\n  template:\n    metadata:\n      labels:\n        app: web\n    spec:\n      containers:\n      - name: web\n        image: nginx:1.25\nEOF"]);
fail('s02-imagepull', 'near miss: still a bad tag', ['kubectl set image deployment/web web=nginx:1.255 -n shop']);
// s04: selector mismatch
pass('s04-no-endpoints', 'relabel the pods instead of the Service', ['kubectl get deploy -n store -o name']); // placeholder replaced below
C.pop();
pass('s04-no-endpoints', 'merge-patch selector', ['kubectl patch svc frontend-svc -n store --type=merge -p ' + J({ spec: { selector: { app: 'frontend' } } })]);
pass('s04-no-endpoints', 'json-patch selector', ["kubectl patch svc frontend-svc -n store --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/selector/app\",\"value\":\"frontend\"}]'"]);
fail('s04-no-endpoints', 'near miss: wrong namespace', ['kubectl patch svc frontend-svc -n default --type=merge -p ' + J({ spec: { selector: { app: 'frontend' } } })]);
// s29: targetPort
pass('s29-svc-targetport', 'patch targetPort', ['kubectl patch svc api -n route --type=json -p=\'[{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]\'']);
// s34: nodeSelector (label a node OR change the selector)
pass('s34-nodeselector', 'label with --overwrite and a quoted value', ["kubectl label node worker2 gpu='true' --overwrite"]);
fail('s34-nodeselector', 'near miss: labelled the wrong node', ['kubectl label node worker1 gpu=true']);
fail('s34-nodeselector', 'near miss: wrong label value', ['kubectl label node worker2 gpu=false']);
// s38: memory too high
pass('s38-memory-too-high', 'smaller request via patch', ['kubectl patch deployment report -n mem -p ' + J({ spec: { template: { spec: { containers: [{ name: 'report', resources: { requests: { memory: '128Mi' } } }] } } } })]);
// s17 drain
pass('s17-drain-cordon', 'cordon then drain', ['kubectl cordon worker1', 'kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data']);
fail('s17-drain-cordon', 'near miss: cordon only', ['kubectl cordon worker1']);
// s11 rbac
pass('s11-rbac-sa', 'group-qualified resource name, binding named differently', ['kubectl create role deploy-manager --verb=get,list,create,update --resource=deployments.apps -n ci', 'kubectl create rolebinding anything -n ci --role=deploy-manager --serviceaccount=ci:deployer']);
fail('s11-rbac-sa', 'near miss: too broad (wildcard verbs)', ['kubectl create role deploy-manager --verb=* --resource=deployments,secrets -n ci', 'kubectl create rolebinding b -n ci --role=deploy-manager --serviceaccount=ci:deployer']);
fail('s11-rbac-sa', 'near miss: binds a different SA', ['kubectl create role deploy-manager --verb=get,list,create,update --resource=deployments -n ci', 'kubectl create rolebinding b -n ci --role=deploy-manager --serviceaccount=ci:other']);
// s30 wrong namespace
pass('s30-wrong-namespace', 'apply with namespace flag', ['kubectl create deployment portal --image=nginx:1.25 --replicas=3 -n staging', 'kubectl delete deploy portal -n default']);
// s13 pvc pending
pass('s13-pvc-pending', 'patch the claim is impossible, recreate', ['kubectl delete pvc store-data -n data --wait=false', 'kubectl create -f - <<EOF\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: store-data\n  namespace: data\nspec:\n  storageClassName: standard\n  accessModes: [ReadWriteOnce]\n  resources:\n    requests:\n      storage: 2Gi\nEOF']);
// ── S156–S169 (outcome, not method) ──
pass('s156-ephemeral-debug', 'debug without -it', ['kubectl debug -n dbg api --image=busybox:1.36 --target=api -c inspector']);
fail('s156-ephemeral-debug', 'near miss: swapped the pod image instead', ['kubectl set image pod/api api=busybox:1.36 -n dbg']);
fail('s156-ephemeral-debug', 'near miss: no target container', ['kubectl debug -n dbg api --image=busybox:1.36 -c inspector']);
pass('s157-debug-copy', 'sleep infinity copy, fix with nginx entrypoint', ['kubectl debug $(kubectl get pods -n dbgcopy -o name | head -1) -n dbgcopy --copy-to=billing-debug --container=app -- sleep infinity', 'kubectl patch deployment billing -n dbgcopy --type=json -p ' + J([{ op: 'replace', path: '/spec/template/spec/containers/0/command', value: ['nginx', '-g', 'daemon off;'] }]), 'kubectl delete pod billing-debug -n dbgcopy']);
fail('s157-debug-copy', 'near miss: debug pod left behind', ['kubectl debug $(kubectl get pods -n dbgcopy -o name | head -1) -n dbgcopy --copy-to=billing-debug --container=app -- sleep 3600', 'kubectl patch deployment billing -n dbgcopy --type=json -p ' + J([{ op: 'remove', path: '/spec/template/spec/containers/0/command' }])]);
fail('s157-debug-copy', 'near miss: deleted and recreated the Deployment', ['kubectl delete deployment billing -n dbgcopy', 'kubectl create deployment billing --image=nginx:1.25 -n dbgcopy']);
const BIND = (extra, act) => 'kubectl apply -f - <<EOF\napiVersion: admissionregistration.k8s.io/v1\nkind: ValidatingAdmissionPolicyBinding\nmetadata:\n  name: b\nspec:\n  policyName: no-latest\n  validationActions: ["' + (act || 'Deny') + '"]\n' + (extra || '') + 'EOF';
pass('s158-vap-binding', 'select by the namespace name label', [BIND('  matchResources:\n    namespaceSelector:\n      matchLabels:\n        kubernetes.io/metadata.name: shop-prod\n')]);
fail('s158-vap-binding', 'near miss: cluster-wide binding', [BIND('')]);
fail('s158-vap-binding', 'near miss: Warn only', [BIND('  matchResources:\n    namespaceSelector:\n      matchLabels:\n        env: prod\n', 'Warn')]);
fail('s158-vap-binding', 'near miss: edited the policy to drop the rule', ['kubectl delete validatingadmissionpolicy no-latest']);
fail('s159-vap-rejected', 'near miss: deleted the binding', ['kubectl delete validatingadmissionpolicybinding team-rules-teamx', 'kubectl apply -f /home/student/web.yaml']);
pass('s159-vap-rejected', 'four replicas via kubectl apply of a new file', ["printf 'apiVersion: apps/v1\\nkind: Deployment\\nmetadata:\\n  name: web\\n  namespace: teamx\\n  labels:\\n    owner: me\\nspec:\\n  replicas: 4\\n  selector:\\n    matchLabels:\\n      app: web\\n  template:\\n    metadata:\\n      labels:\\n        app: web\\n    spec:\\n      containers:\\n      - name: web\\n        image: registry.k8s.io/pause:3.9\\n' > /tmp/w.yaml", 'kubectl apply -f /tmp/w.yaml']);
pass('s160-pvc-expand', 'merge patch on the StorageClass', ['kubectl patch storageclass slow --type=merge -p ' + J({ allowVolumeExpansion: true }), 'kubectl patch pvc db-data -n data --type=merge -p ' + J({ spec: { resources: { requests: { storage: '3Gi' } } } })]);
fail('s160-pvc-expand', 'near miss: delete and recreate the claim', ['kubectl patch storageclass slow -p ' + J({ allowVolumeExpansion: true }), 'kubectl delete pod db -n data', 'kubectl delete pvc db-data -n data', "printf 'apiVersion: v1\\nkind: PersistentVolumeClaim\\nmetadata:\\n  name: db-data\\n  namespace: data\\nspec:\\n  storageClassName: slow\\n  accessModes: [ReadWriteOnce]\\n  resources:\\n    requests:\\n      storage: 3Gi\\n' | kubectl apply -f -"]);
fail('s160-pvc-expand', 'near miss: only the claim, class not changed', ['kubectl patch pvc db-data -n data -p ' + J({ spec: { resources: { requests: { storage: '3Gi' } } } })]);
fail('s161-immutable-config', 'near miss: deleted v1 and recreated with debug', ['kubectl delete cm web-config-v1 -n conf', "printf 'apiVersion: v1\\nkind: ConfigMap\\nmetadata:\\n  name: web-config-v1\\n  namespace: conf\\nimmutable: true\\ndata:\\n  LOG_LEVEL: debug\\n' | kubectl apply -f -", 'kubectl rollout restart deployment/web -n conf']);
fail('s161-immutable-config', 'near miss: v2 not immutable', ["printf 'apiVersion: v1\\nkind: ConfigMap\\nmetadata:\\n  name: web-config-v2\\n  namespace: conf\\ndata:\\n  LOG_LEVEL: debug\\n' | kubectl apply -f -", 'kubectl patch deployment web -n conf --type=json -p ' + J([{ op: 'replace', path: '/spec/template/spec/containers/0/envFrom/0/configMapRef/name', value: 'web-config-v2' }])]);
fail('s163-native-sidecar', 'near miss: plain init container (blocks the pod)', ['kubectl patch deployment shop -n side --type=json -p ' + J([{ op: 'remove', path: '/spec/template/spec/containers/1' }, { op: 'add', path: '/spec/template/spec/initContainers', value: [{ name: 'shipper', image: 'busybox:1.36', command: ['sh', '-c', 'sleep 3600'] }] }])]);
const NP = (ports) => 'kubectl apply -f - <<EOF\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: allow\n  namespace: ranges\nspec:\n  podSelector:\n    matchLabels:\n      app: api\n  policyTypes: ["Ingress"]\n  ingress:\n  - from:\n    - podSelector:\n        matchLabels: {}\n' + (ports ? '    ports:\n' + ports : '') + 'EOF';
pass('s164-netpol-iprange', 'two port entries instead of endPort (same outcome)', [NP('    - port: 8080\n    - port: 8081\n').replace('podSelector:\n        matchLabels: {}', 'ipBlock:\n        cidr: 10.244.0.0/16')]);
fail('s164-netpol-iprange', 'near miss: no ports restriction', [NP('')]);
fail('s164-netpol-iprange', 'near miss: ipBlock for the wrong range', [NP('    - port: 8080\n      endPort: 8081\n').replace('podSelector:\n        matchLabels: {}', 'ipBlock:\n        cidr: 192.168.0.0/16')]);
fail('s165-inplace-resize', 'near miss: plain patch without the subresource', ['kubectl patch pod worker -n resize -p ' + J({ spec: { containers: [{ name: 'worker', resources: { requests: { cpu: '400m' }, limits: { cpu: '400m' } } }] } })]);
fail('s165-inplace-resize', 'near miss: limit only (QoS would change)', ['kubectl patch pod worker -n resize --subresource resize -p ' + J({ spec: { containers: [{ name: 'worker', resources: { limits: { cpu: '400m' } } }] } })]);
fail('s165-inplace-resize', 'near miss: recreate the pod', ['kubectl delete pod worker -n resize', 'kubectl run worker -n resize --image=nginx:1.25 --requests=cpu=400m,memory=128Mi --limits=cpu=400m,memory=128Mi']);
fail('s166-user-namespace', 'near miss: hostUsers true', ['kubectl patch deployment legacy -n userns -p ' + J({ spec: { template: { spec: { hostUsers: true } } } })]);
fail('s169-build-from-explain', 'near miss: ScheduleAnyway', ['kubectl patch deployment web -n spread -p ' + J({ spec: { template: { spec: { topologySpreadConstraints: [{ maxSkew: 1, topologyKey: 'kubernetes.io/hostname', whenUnsatisfiable: 'ScheduleAnyway', labelSelector: { matchLabels: { app: 'web' } } }] } } } })]);

let bad = 0, only = process.argv[2];
for (const c of C) {
  if (only && c.id.indexOf(only) < 0) continue;
  const lab = Labs.byId[c.id]; if (!lab) { console.log('✘ unknown lab', c.id); bad++; continue; }
  const s = new Sim(); Labs.setup(s, lab);
  const r = s.exec(c.cmds.join('\n')); s.settle(40);
  const res = Labs.check(s, lab), ok = !!res.ok === c.expect;
  if (!ok) { bad++; console.log('✘', c.id, '—', c.name, '(expected', c.expect ? 'PASS' : 'FAIL', 'got', res.ok ? 'PASS' : 'FAIL', res.passed + '/' + res.total + ')'); res.tasks.forEach(t => t.results.forEach(x => { if (!x.ok) console.log('    ·', x.msg); })); if (r.stderr) console.log('    stderr:', r.stderr.split('\n')[0]); }
  else console.log('✔', c.id, '—', c.name);
}
console.log(bad ? '\n' + bad + ' alternative-solution case(s) FAILED' : '\nall ' + C.length + ' alternative-solution cases OK'); if (bad) process.exit(1);
