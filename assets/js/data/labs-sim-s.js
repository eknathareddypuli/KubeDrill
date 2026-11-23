/* Labs S182–S189: CKAD workload skills (multi-container logs, events triage, removed API versions, selectors at scale, named ports,
   the adapter pattern, Kustomize, Helm values). Original scenarios from the public curriculum outline, not exam questions.
   Marked simOnly: they are verified in the simulator; they have not been run against a real cluster. */
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
  function ctr(name, image, cmd) { return '      - name: ' + name + '\n        image: ' + image + (cmd ? '\n        command: ["sh", "-c", ' + JSON.stringify(cmd) + ']' : ''); }
  function POD(name, ns, labels, image) { return Y('apiVersion: v1', 'kind: Pod', 'metadata:', '  name: ' + name, '  namespace: ' + ns, '  labels:', Object.keys(labels).map(function (k) { return '    ' + k + ': ' + labels[k]; }).join('\n'), 'spec:', '  containers:', '  - name: c', '    image: ' + (image || 'nginx:1.25')); }

  Labs.register([
    // ── S182 multi-container logs ──
    L({ id: 's182-multi-logs', num: 'S182', title: 'Two containers in one pod: which one is crashing?', diff: 'Intermediate', track: ['CKAD', 'CKA'], domain: 'Observability', time: '12 min', ns: 'logs-lab',
      story: 'The `checkout` Deployment in `logs-lab` runs two containers per pod: `web` and `sync`. Pods show `1/2` and restart. `kubectl logs <pod>` without a container name asks you to pick one. Save the log of the **previous** (crashed) run of the failing container to `/root/sync-crash.log`, read what it says, and fix the Deployment so both containers stay up.',
      caution: 'Do not delete the pods to "reset" them: a restart wipes the evidence (`--previous` only keeps the last crashed run). Read the log first, then change the Deployment, not individual pods.',
      setup: [NSY('logs-lab'), DEPL('checkout', 'logs-lab', 2, '', ctr('web', 'nginx:1.25') + '\n' + ctr('sync', 'busybox:1.36', "echo 'sync: connecting to cache:6397'; echo 'sync: ERROR connection refused (cache:6397)'; exit 1"))],
      tasks: [
        T('Save the previous run of the crashing container to `/root/sync-crash.log`', ['`kubectl get pods -n logs-lab`: `1/2` shows that one container is failing.', '`kubectl get pod <pod> -n logs-lab -o jsonpath="{.status.containerStatuses[*].name}"` lists the containers.', '`kubectl logs <pod> -n logs-lab -c sync --previous > /root/sync-crash.log`'], [{ t: 'fileRe', path: '/root/sync-crash.log', re: '6397', msg: 'the file must hold the crashed container\'s log' }]),
        T('Fix the port typo in the Deployment so both containers stay up', ['The log shows the port it tried: `6397`. A cache normally listens on `6379`.', 'Edit the Deployment: `kubectl edit deploy checkout -n logs-lab`, or export, `sed` and `replace`.'], [{ t: 'podsReady', ns: 'logs-lab', sel: 'app=checkout', min: 2 }])
      ],
      solution: ['kubectl get pods -n logs-lab', "kubectl logs $(kubectl get pods -n logs-lab -o jsonpath='{.items[0].metadata.name}') -n logs-lab -c sync --previous > /root/sync-crash.log", "kubectl get deploy checkout -n logs-lab -o yaml | sed 's/6397/6379/g; s/exit 1/sleep 3600/; s/ERROR connection refused (cache:6379)/connected/' | kubectl replace -f -", 'kubectl rollout status deploy/checkout -n logs-lab'] }),

    // ── S183 events triage ──
    L({ id: 's183-events-triage', num: 'S183', title: 'Five warnings in the namespace: find the one that matters', diff: 'Intermediate', track: ['CKAD', 'CKA'], domain: 'Troubleshooting', time: '12 min', ns: 'events-lab',
      story: 'Customers report that the `shop` Service in `events-lab` has no healthy backends. `kubectl get events` shows warnings from several workloads, most of them old, unrelated problems nobody owns. Filter the events down to the object you were asked about, write the **name of the missing object** that keeps the `shop` pods from starting into `/root/culprit.txt`, and fix `shop` without touching the other workloads.',
      caution: 'Other teams\' workloads in the namespace are broken on purpose in ways that are not your ticket: do not delete or "fix" them. Narrow the output first: `kubectl events --for pod/<name>`, or `--field-selector involvedObject.name=<pod>`, or `--types=Warning`.',
      constraint: { text: 'Leave the other teams\' workloads alone.', assert: [{ t: 'exists', ref: 'deploy/legacy-report', ns: 'events-lab' }, { t: 'exists', ref: 'deploy/metrics-agent-old', ns: 'events-lab' }, { t: 'exists', ref: 'deploy/big-batch', ns: 'events-lab' }] },
      setup: [NSY('events-lab'),
        DEPL('shop', 'events-lab', 2, '', ctr('web', 'nginx:1.25') + '\n        volumeMounts:\n        - name: cfg\n          mountPath: /etc/shop', '      volumes:\n      - name: cfg\n        configMap:\n          name: shop-config'),
        Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: shop', '  namespace: events-lab', 'spec:', '  selector:', '    app: shop', '  ports:', '  - port: 80'),
        DEPL('legacy-report', 'events-lab', 1, '', ctr('c', 'nginx:1.255')),
        DEPL('metrics-agent-old', 'events-lab', 1, '', ctr('c', 'busybox:1.36', "echo 'agent: starting'; exit 1")),
        DEPL('big-batch', 'events-lab', 1, '', ctr('c', 'nginx:1.25'), '      nodeSelector:\n        disk: nvme')],
      tasks: [
        T('Record the missing object that blocks the `shop` pods', ['`kubectl get pods -n events-lab` shows which pods are not Ready.', '`kubectl events -n events-lab --for pod/<shop pod>`: the Warning names the object it could not find.', '`echo <name> > /root/culprit.txt`'], [{ t: 'fileRe', path: '/root/culprit.txt', re: 'shop-config', msg: 'write the name of the object the event says is missing' }]),
        T('Make `shop` healthy with two ready pods', ['Create the missing object in the same namespace. Any key will do for the mount.', '`kubectl create configmap shop-config -n events-lab --from-literal=app.conf=ok`'], [{ t: 'podsReady', ns: 'events-lab', sel: 'app=shop', min: 2 }, { t: 'endpoints', ns: 'events-lab', svc: 'shop', min: 2 }])
      ],
      solution: ['kubectl get pods -n events-lab', 'kubectl events -n events-lab --types=Warning', "kubectl events -n events-lab --for pod/$(kubectl get pods -n events-lab -l app=shop -o jsonpath='{.items[0].metadata.name}')", 'echo shop-config > /root/culprit.txt', 'kubectl create configmap shop-config -n events-lab --from-literal=app.conf=ok', 'kubectl get pods -n events-lab -l app=shop'] }),

    // ── S184 removed API versions ──
    L({ id: 's184-removed-apis', num: 'S184', title: 'Manifests from the old cluster: removed API versions', diff: 'Intermediate', track: ['CKAD', 'CKA'], domain: 'Configuration', time: '15 min', ns: 'api-lab',
      story: 'Three manifests from a cluster that ran Kubernetes 1.15 sit in `/root/old/`: a Deployment (`extensions/v1beta1`), an Ingress (`networking.k8s.io/v1beta1`) and a CronJob (`batch/v1beta1`). `kubectl apply` rejects them on this cluster. Update the three files in place to the API versions that exist today (and the fields those versions require), then apply them all in `api-lab`.',
      caution: 'Changing only `apiVersion` is not enough: `apps/v1` requires `spec.selector`, and `networking.k8s.io/v1` changed the Ingress backend schema and requires `pathType`. Read the error, check `kubectl api-resources` and `kubectl explain`, and keep the original names and behaviour.',
      setup: [NSY('api-lab')],
      files: [
        { path: '/root/old/deploy.yaml', content: Y('apiVersion: extensions/v1beta1', 'kind: Deployment', 'metadata:', '  name: shop', '  namespace: api-lab', 'spec:', '  replicas: 2', '  template:', '    metadata:', '      labels:', '        app: shop', '    spec:', '      containers:', '      - name: web', '        image: nginx:1.25') },
        { path: '/root/old/ingress.yaml', content: Y('apiVersion: networking.k8s.io/v1beta1', 'kind: Ingress', 'metadata:', '  name: shop', '  namespace: api-lab', 'spec:', '  rules:', '  - host: shop.example.com', '    http:', '      paths:', '      - path: /', '        backend:', '          serviceName: shop', '          servicePort: 80') },
        { path: '/root/old/cronjob.yaml', content: Y('apiVersion: batch/v1beta1', 'kind: CronJob', 'metadata:', '  name: cleanup', '  namespace: api-lab', 'spec:', '  schedule: "*/10 * * * *"', '  jobTemplate:', '    spec:', '      template:', '        spec:', '          restartPolicy: Never', '          containers:', '          - name: c', '            image: busybox:1.36', '            command: ["sh", "-c", "echo cleaning"]') }],
      tasks: [
        T('Update the Deployment manifest and apply it', ['`kubectl apply -f /root/old/deploy.yaml` shows which version is gone.', '`apps/v1` needs `spec.selector.matchLabels` that match the template labels.'], [{ t: 'podsReady', ns: 'api-lab', sel: 'app=shop', min: 2 }, { t: 'fileNo', path: '/root/old/deploy.yaml', re: 'v1beta1', msg: 'fix the file itself, not only the cluster object' }]),
        T('Update the Ingress manifest and apply it', ['In `networking.k8s.io/v1`: `backend.service.name` and `backend.service.port.number`, and `pathType: Prefix`.'], [{ t: 'jp', ref: 'ingress/shop', ns: 'api-lab', path: '.spec.rules[0].http.paths[0].backend.service.name', eq: 'shop' }, { t: 'fileNo', path: '/root/old/ingress.yaml', re: 'v1beta1' }]),
        T('Update the CronJob manifest and apply it', ['`batch/v1beta1` was removed; the CronJob lives in `batch/v1`. The fields stay the same.'], [{ t: 'exists', ref: 'cronjob/cleanup', ns: 'api-lab' }, { t: 'fileNo', path: '/root/old/cronjob.yaml', re: 'v1beta1' }])
      ],
      solution: ["cat > /root/old/deploy.yaml <<'EOF'\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: shop\n  namespace: api-lab\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: shop\n  template:\n    metadata:\n      labels:\n        app: shop\n    spec:\n      containers:\n      - name: web\n        image: nginx:1.25\nEOF", 'kubectl apply -f /root/old/deploy.yaml',
        "cat > /root/old/ingress.yaml <<'EOF'\napiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: shop\n  namespace: api-lab\nspec:\n  rules:\n  - host: shop.example.com\n    http:\n      paths:\n      - path: /\n        pathType: Prefix\n        backend:\n          service:\n            name: shop\n            port:\n              number: 80\nEOF", 'kubectl apply -f /root/old/ingress.yaml',
        "sed -i 's#batch/v1beta1#batch/v1#' /root/old/cronjob.yaml", 'kubectl apply -f /root/old/cronjob.yaml'] }),

    // ── S185 selectors at scale ──
    L({ id: 's185-labels-at-scale', num: 'S185', title: 'Label, annotate and select at scale', diff: 'Beginner', track: ['CKAD', 'CKA'], domain: 'Configuration', time: '10 min', ns: 'lbl-lab',
      story: 'Six pods run in `lbl-lab`: four labelled `env=prod`, two `env=dev`. The platform team wants every **prod** pod to carry `team=payments`, to lose the obsolete label `legacy`, and to be annotated `owner=payments-oncall`. The dev pods must not change at all. Do it with selectors, not pod by pod.',
      caution: 'A label command without a selector, or with `--all`, touches everything in the namespace, including pods you were told to leave alone. Preview the target set first with `kubectl get pods -l env=prod --show-labels`.',
      constraint: { text: 'The `env=dev` pods must keep their labels and annotations.', assert: [{ t: 'jp', ref: 'pod/dev-1', ns: 'lbl-lab', path: '.metadata.labels.legacy', eq: 'true' }, { t: 'count', kind: 'pods', ns: 'lbl-lab', sel: 'env=dev,team=payments', min: 0, max: 0 }] },
      setup: [NSY('lbl-lab')].concat(['prod-1', 'prod-2', 'prod-3', 'prod-4'].map(function (n) { return POD(n, 'lbl-lab', { env: 'prod', legacy: '"true"' }); })).concat(['dev-1', 'dev-2'].map(function (n) { return POD(n, 'lbl-lab', { env: 'dev', legacy: '"true"' }); })),
      tasks: [
        T('Every prod pod has `team=payments`', ['`kubectl label pods -l env=prod team=payments -n lbl-lab`'], [{ t: 'count', kind: 'pods', ns: 'lbl-lab', sel: 'env=prod,team=payments', min: 4 }]),
        T('No prod pod has the `legacy` label any more', ['A label is removed by suffixing its key with a dash: `legacy-`.'], [{ t: 'count', kind: 'pods', ns: 'lbl-lab', sel: 'env=prod,legacy', min: 0, max: 0 }]),
        T('Every prod pod is annotated `owner=payments-oncall`', ['`kubectl annotate pods -l env=prod owner=payments-oncall -n lbl-lab`'], [{ t: 'jp', ref: 'pod/prod-1', ns: 'lbl-lab', path: '.metadata.annotations.owner', eq: 'payments-oncall' }, { t: 'jp', ref: 'pod/prod-4', ns: 'lbl-lab', path: '.metadata.annotations.owner', eq: 'payments-oncall' }])
      ],
      solution: ['kubectl get pods -n lbl-lab --show-labels', 'kubectl label pods -l env=prod team=payments -n lbl-lab', 'kubectl label pods -l env=prod legacy- -n lbl-lab', 'kubectl annotate pods -l env=prod owner=payments-oncall -n lbl-lab'] }),

    // ── S186 named port ──
    L({ id: 's186-named-port', num: 'S186', title: 'Service targetPort by name: no endpoints', diff: 'Intermediate', track: ['CKAD', 'CKA'], domain: 'Networking', time: '10 min', ns: 'port-lab',
      story: 'The Service `api` in `port-lab` has no endpoints, though its pods are Running and Ready and the selector matches. The Service sends traffic to `targetPort: http`; the container declares a port with a different name. Fix the Service (not the pods) so `api` has endpoints.',
      caution: 'A named `targetPort` is looked up in each pod\'s container ports. Renaming the container port would restart every pod; changing the Service is a one-line, non-disruptive fix.',
      setup: [NSY('port-lab'), DEPL('api', 'port-lab', 2, '', ctr('c', 'nginx:1.25') + '\n        ports:\n        - name: web\n          containerPort: 80'),
        Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: api', '  namespace: port-lab', 'spec:', '  selector:', '    app: api', '  ports:', '  - port: 80', '    targetPort: http')],
      tasks: [
        T('Find the declared port name', ['Check the Service\'s endpoints in the namespace: they are empty although the pods are Ready.', 'The container ports of a pod are in its spec: use `-o jsonpath` or `describe` on one pod.'], [{ t: 'jp', ref: 'svc/api', ns: 'port-lab', path: '.spec.ports[0].targetPort', eq: 'web', msg: 'the Service must target the port by the name the container declares' }]),
        T('`api` has two endpoints', ['Endpoints are filled in as soon as the name resolves.'], [{ t: 'endpoints', ns: 'port-lab', svc: 'api', min: 2 }])
      ],
      solution: ['kubectl get ep api -n port-lab', "kubectl get pods -n port-lab -o jsonpath='{.items[0].spec.containers[0].ports}'", `kubectl patch svc api -n port-lab -p '{"spec":{"ports":[{"port":80,"targetPort":"web"}]}}'`, 'kubectl get ep api -n port-lab -o wide'] }),

    // ── S187 adapter pattern ──
    L({ id: 's187-adapter-sidecar', num: 'S187', title: 'Adapter pattern: expose legacy logs to a collector', diff: 'Intermediate', track: ['CKAD'], domain: 'Design', time: '15 min', ns: 'adapter-lab',
      story: 'The Deployment `legacy-app` in `adapter-lab` writes its log to `/var/log/app` inside an `emptyDir` volume named `logs`. A collector expects JSON on the container\'s stdout. Add an **adapter** sidecar named `exporter` (image `busybox:1.36`) to the pod template: it mounts the same `logs` volume at `/logs` **read-only** and keeps running (use `tail -f`). Do not change the app container.',
      caution: 'A sidecar shares the pod\'s lifecycle and volumes, not its filesystem: without the shared `emptyDir` the adapter would see nothing. Mount it read-only so the adapter cannot corrupt the log it only needs to read.',
      setup: [NSY('adapter-lab'), DEPL('legacy-app', 'adapter-lab', 1, '', ctr('app', 'nginx:1.25') + '\n        volumeMounts:\n        - name: logs\n          mountPath: /var/log/app', '      volumes:\n      - name: logs\n        emptyDir: {}')],
      tasks: [
        T('Add the `exporter` container sharing `logs` read-only', ['`kubectl edit deploy legacy-app -n adapter-lab`', 'The new container needs `volumeMounts: [{name: logs, mountPath: /logs, readOnly: true}]` and a command such as `["sh","-c","tail -f /logs/app.log"]`.'], [{ t: 'jp', ref: 'deploy/legacy-app', ns: 'adapter-lab', path: '.spec.template.spec.containers[1].name', eq: 'exporter' }, { t: 'jp', ref: 'deploy/legacy-app', ns: 'adapter-lab', path: '.spec.template.spec.containers[1].volumeMounts[0].readOnly', eq: 'true' }, { t: 'jp', ref: 'deploy/legacy-app', ns: 'adapter-lab', path: '.spec.template.spec.containers[1].volumeMounts[0].name', eq: 'logs' }]),
        T('The adapter keeps running and the pod is Ready with both containers', ['A container whose command finishes exits and restarts: use `tail -f`.', '`kubectl get pods -n adapter-lab` shows `2/2`.'], [{ t: 'jpRe', ref: 'deploy/legacy-app', ns: 'adapter-lab', path: '.spec.template.spec.containers[1].command', re: 'tail -f', msg: 'the adapter must keep running (tail -f)' }, { t: 'podsReady', ns: 'adapter-lab', sel: 'app=legacy-app', min: 1 }])
      ],
      solution: [`kubectl patch deploy legacy-app -n adapter-lab --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/-","value":{"name":"exporter","image":"busybox:1.36","command":["sh","-c","tail -f /logs/app.log"],"volumeMounts":[{"name":"logs","mountPath":"/logs","readOnly":true}]}}]'`, 'kubectl rollout status deploy/legacy-app -n adapter-lab'] }),

    // ── S188 kustomize ──
    L({ id: 's188-kustomize-overlay', num: 'S188', title: 'Kustomize: a prod overlay with a patch and a generated ConfigMap', diff: 'Intermediate', track: ['CKAD'], domain: 'Deployment', time: '15 min', ns: 'kust-lab',
      story: 'The base in `/root/app/base` defines a `web` Deployment (1 replica, `nginx:1.24`) that reads a ConfigMap `settings` through `envFrom`. Create the overlay `/root/app/prod/kustomization.yaml` so that building it gives: every name prefixed `prod-`, 3 replicas, image `nginx:1.25`, a strategic-merge patch adding the label `tier: frontend` to the pod template, and a ConfigMap generated from the literal `MODE=production` (the generator rewrites the reference for you). Apply it into `kust-lab` with `kubectl apply -k`.',
      caution: 'Never edit the base for one environment: overlays exist so that dev, staging and prod can share it. Run `kubectl kustomize /root/app/prod` and read the result before you apply it.',
      setup: [NSY('kust-lab')],
      files: [
        { path: '/root/app/base/kustomization.yaml', content: Y('resources:', '- deployment.yaml', 'namespace: kust-lab') },
        { path: '/root/app/base/deployment.yaml', content: Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: web', 'spec:', '  replicas: 1', '  selector:', '    matchLabels:', '      app: web', '  template:', '    metadata:', '      labels:', '        app: web', '    spec:', '      containers:', '      - name: web', '        image: nginx:1.24', '        envFrom:', '        - configMapRef:', '            name: settings') }],
      tasks: [
        T('Write the prod overlay', ['`resources: [../base]`, `namespace: kust-lab`, `namePrefix`, `replicas`, `images`, `patches` and `configMapGenerator` are the keys.', '`kubectl kustomize /root/app/prod` previews the result.'], [{ t: 'fileRe', path: '/root/app/prod/kustomization.yaml', re: 'configMapGenerator', msg: 'use a generator for the ConfigMap' }, { t: 'fileNo', path: '/root/app/base/deployment.yaml', re: 'replicas: 3', msg: 'the base must stay unchanged' }]),
        T('Apply it: `prod-web` runs 3 Ready replicas on `nginx:1.25`', ['`kubectl apply -k /root/app/prod`', 'The generated ConfigMap has a hash suffix and the Deployment refers to that exact name.'], [{ t: 'podsReady', ns: 'kust-lab', sel: 'app=web', min: 3 }, { t: 'jp', ref: 'deploy/prod-web', ns: 'kust-lab', path: '.spec.template.spec.containers[0].image', eq: 'nginx:1.25' }, { t: 'jp', ref: 'deploy/prod-web', ns: 'kust-lab', path: '.spec.template.metadata.labels.tier', eq: 'frontend' }])
      ],
      solution: ["mkdir -p /root/app/prod", "cat > /root/app/prod/kustomization.yaml <<'EOF'\nresources:\n- ../base\nnamespace: kust-lab\nnamePrefix: prod-\nreplicas:\n- name: web\n  count: 3\nimages:\n- name: nginx\n  newTag: \"1.25\"\npatches:\n- patch: |-\n    apiVersion: apps/v1\n    kind: Deployment\n    metadata:\n      name: web\n    spec:\n      template:\n        metadata:\n          labels:\n            tier: frontend\nconfigMapGenerator:\n- name: settings\n  literals:\n  - MODE=production\nEOF", 'kubectl kustomize /root/app/prod', 'kubectl apply -k /root/app/prod', 'kubectl rollout status deploy/prod-web -n kust-lab'] }),

    // ── S189 helm values ──
    L({ id: 's189-helm-reuse-values', num: 'S189', title: 'Helm upgrade without losing the values you set', diff: 'Intermediate', track: ['CKAD'], domain: 'Deployment', time: '12 min', ns: 'helm-lab',
      story: 'The release `shop` (chart `kd/web`) in `helm-lab` was installed with `replicaCount=3` and `service.type=NodePort`. Release notes say to move to image tag `1.26`. Upgrade the release so that **only** the image tag changes: it must still run 3 replicas and keep the NodePort Service. Check `helm get values shop` before and after. The chart names its objects `<release>-web`: the Deployment and the Service are both called `shop-web`.',
      caution: 'Without `--reuse-values` (or `-f` with every value), `helm upgrade` resets all values you gave at install to the chart defaults: replicas drop to 1 and the Service type reverts, silently. Always read the current values before upgrading.',
      setup: [NSY('helm-lab')],
      setupCmds: ['helm repo add kd https://charts.kubedrill.example', 'helm install shop kd/web -n helm-lab --set replicaCount=3 --set service.type=NodePort'],
      tasks: [
        T('Read the values the release was installed with', ['`helm get values shop -n helm-lab`'], [{ t: 'jp', ref: 'svc/shop-web', ns: 'helm-lab', path: '.spec.type', eq: 'NodePort', msg: 'the Service must still be a NodePort' }]),
        T('Upgrade to image tag 1.26 keeping 3 replicas and the NodePort Service', ['`helm upgrade shop kd/web -n helm-lab --reuse-values --set image.tag=1.26`'], [{ t: 'jp', ref: 'deploy/shop-web', ns: 'helm-lab', path: '.spec.template.spec.containers[0].image', eq: 'nginx:1.26' }, { t: 'jp', ref: 'deploy/shop-web', ns: 'helm-lab', path: '.spec.replicas', eq: '3' }, { t: 'jp', ref: 'svc/shop-web', ns: 'helm-lab', path: '.spec.type', eq: 'NodePort' }])
      ],
      solution: ['helm get values shop -n helm-lab', 'helm upgrade shop kd/web -n helm-lab --reuse-values --set image.tag=1.26', 'helm history shop -n helm-lab'] })
  ]);
  if (KL.COMP) KL.COMP.add({ 's183-events-triage': 'cka-logs ckad-debug', 's182-multi-logs': 'cka-logs ckad-multi ckad-debug', 's184-removed-apis': 'ckad-api ckad-deploy', 's185-labels-at-scale': 'ckad-deploy cka-pod', 's186-named-port': 'ckad-svc cka-svc', 's187-adapter-sidecar': 'ckad-multi ckad-vol', 's188-kustomize-overlay': 'ckad-kust', 's189-helm-reuse-values': 'ckad-helm cka-pkg' });
})(typeof window !== 'undefined' ? window : globalThis);
