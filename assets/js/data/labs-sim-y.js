/* Labs S229–S233: "same symptom, different cause" triage sets (Pending, CrashLoopBackOff, no endpoints, CreateContainerConfigError) and a
   noisy namespace where the skill is leaving the harmless oddities alone. Original scenarios from the public curriculum outline, not exam questions.
   Marked simOnly: verified in the simulator, not on a real cluster. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js');
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); o.curriculum = true; o.simOnly = true; return o; }
  function Y() { return Array.prototype.slice.call(arguments).join('\n') + '\n'; }
  function NSY(n) { return Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: ' + n); }
  var D = Labs.y.dep, S = Labs.y.svc;
  Labs.register([
    // ── S229 Pending: three different causes ──
    L({ id: 's229-pending-three-causes', num: 'S229', title: 'Symptom set: three pods Pending, three different causes', diff: 'Intermediate', track: ['CKA'], domain: 'Troubleshooting', time: '15 min', ns: 'triage-p', symptomSet: 'pending',
      story: 'Three Deployments in `triage-p` (`ledger`, `mailer` and `render`, one pod each) all show `Pending`. They look identical in `kubectl get pods`, but each is stuck for a different reason, and the scheduler says which in the Events of each pod. Get all three Ready. Do not delete the Deployments.',
      caution: 'Same status, different cause: read the Events of each pod before you touch anything. One fix does not carry over to the others. A node selector, a resource request and a volume claim are three separate things the scheduler checks.',
      setup: [NSY('triage-p'),
        D('ledger', 'triage-p', 'nginx:1.25', 1, '', '      nodeSelector:\n        disktype: ssd\n'),
        D('mailer', 'triage-p', 'nginx:1.25', 1, '        resources:\n          requests:\n            memory: 64Gi\n'),
        Y('apiVersion: v1', 'kind: PersistentVolumeClaim', 'metadata:', '  name: render-data', '  namespace: triage-p', 'spec:', '  storageClassName: fast-ssd', '  accessModes: [ReadWriteOnce]', '  resources:', '    requests:', '      storage: 1Gi'),
        D('render', 'triage-p', 'nginx:1.25', 1, '        volumeMounts:\n        - name: data\n          mountPath: /data\n', '      volumes:\n      - name: data\n        persistentVolumeClaim:\n          claimName: render-data\n')],
      tasks: [
        T('`ledger` is Ready', ['`kubectl describe pod -l app=ledger -n triage-p`: the event names a node selector that no node satisfies.', 'Either label a node or remove the selector. The selector is the mistake here: the nodes are fine.'], [{ t: 'podsReady', ns: 'triage-p', sel: 'app=ledger', min: 1 }]),
        T('`mailer` is Ready', ['The event says "Insufficient memory": the request is far above any node.', 'Request 64Mi instead of 64Gi.'], [{ t: 'podsReady', ns: 'triage-p', sel: 'app=mailer', min: 1 }]),
        T('`render` is Ready and still uses `render-data`', ['The pod waits for an unbound claim. `kubectl get pvc -n triage-p` and `kubectl get storageclass`.', 'The claim names a StorageClass that does not exist. A claim\'s class cannot be edited, so recreate the claim with the default class, keeping the name.'], [{ t: 'podsReady', ns: 'triage-p', sel: 'app=render', min: 1 }, { t: 'exists', ref: 'pvc/render-data', ns: 'triage-p' }])
      ],
      solution: ['kubectl get pods -n triage-p', `kubectl patch deploy ledger -n triage-p --type=json -p '[{"op":"remove","path":"/spec/template/spec/nodeSelector"}]'`, `kubectl patch deploy mailer -n triage-p --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/resources/requests/memory","value":"64Mi"}]'`, 'kubectl delete pvc render-data -n triage-p --wait=false', `printf 'apiVersion: v1\\nkind: PersistentVolumeClaim\\nmetadata:\\n  name: render-data\\n  namespace: triage-p\\nspec:\\n  accessModes: [ReadWriteOnce]\\n  resources:\\n    requests:\\n      storage: 1Gi\\n' | kubectl apply -f -`, 'kubectl get pods -n triage-p'] }),

    // ── S230 CrashLoopBackOff: three different causes ──
    L({ id: 's230-crashloop-three-causes', num: 'S230', title: 'Symptom set: three CrashLoopBackOff pods, three different causes', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '15 min', ns: 'triage-c', symptomSet: 'crashloop',
      story: 'In `triage-c`, the Deployments `site`, `crunch` and `batcher` (one pod each) are all in `CrashLoopBackOff`. The restart counter climbs on every one. The container did not fail to start for the same reason: one is killed by a probe, one is killed by the kernel, one exits by itself. Find each reason in `kubectl describe` and get all three Ready.',
      caution: 'Exit code 137 can mean the OOM killer or a failed liveness probe: read the `Last State` reason and the Events, not only the number. Do not raise a limit before you know it was the limit.',
      setup: [NSY('triage-c'),
        D('site', 'triage-c', 'nginx:1.25', 1, '        livenessProbe:\n          httpGet:\n            path: /healthz\n            port: 80\n          initialDelaySeconds: 1\n'),
        D('crunch', 'triage-c', 'polinux/stress', 1, '        command: ["stress"]\n        args: ["--vm", "1", "--vm-bytes", "150M", "--vm-hang", "1"]\n        resources:\n          limits:\n            memory: 100Mi\n'),
        D('batcher', 'triage-c', 'busybox:1.36', 1, '        command: ["sh", "-c", "echo starting; exit 3"]\n')],
      tasks: [
        T('`site` stops being restarted by its probe', ['`kubectl describe pod -l app=site -n triage-c`: "Liveness probe failed" with a 404.', 'nginx serves `/`, not `/healthz`. Point the probe at `/`.'], [{ t: 'jp', ref: 'deploy/site', ns: 'triage-c', path: '.spec.template.spec.containers[0].livenessProbe.httpGet.path', eq: '/', msg: 'the liveness probe must request a path nginx serves' }, { t: 'podsReady', ns: 'triage-c', sel: 'app=site', min: 1 }]),
        T('`crunch` is no longer OOMKilled', ['`Last State: Terminated, Reason: OOMKilled`.', 'The program needs about 150Mi. Raise the memory limit to at least 256Mi.'], [{ t: 'podsReady', ns: 'triage-c', sel: 'app=crunch', min: 1 }]),
        T('`batcher` keeps running', ['`kubectl logs -l app=batcher -n triage-c` shows one line, then the container ends with exit code 3.', 'The command exits on purpose. Make it stay in the foreground, for example `sleep 3600`.'], [{ t: 'podsReady', ns: 'triage-c', sel: 'app=batcher', min: 1 }])
      ],
      solution: ['kubectl get pods -n triage-c', `kubectl patch deploy site -n triage-c --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/path","value":"/"}]'`, 'kubectl set resources deploy/crunch -n triage-c --limits=memory=256Mi', `kubectl patch deploy batcher -n triage-c --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/command","value":["sh","-c","sleep 3600"]}]'`, 'kubectl get pods -n triage-c'] }),

    // ── S231 Service with no endpoints: three different causes ──
    L({ id: 's231-noendpoints-three-causes', num: 'S231', title: 'Symptom set: three Services answer nothing, three different causes', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Services & networking', time: '15 min', ns: 'triage-s', symptomSet: 'endpoints',
      story: 'Namespace `triage-s` has three web Deployments, each with its own Service (`shop`, `blog` and `docs`, port 80). From the `tester` pod, none of the three answers. The Services exist and the pods are Running, but each Service is broken in its own way. Make `tester` reach all three.',
      caution: 'An empty Endpoints list can come from a selector that matches no pod, from pods that are not Ready, or from a target port nothing listens on. They look the same from outside. Check the Endpoints object first, then the Service selector, the pod labels and the port.',
      setup: [NSY('triage-s'), Labs.y.tester('triage-s'),
        D('shop', 'triage-s', 'nginx:1.25', 1), S('shop', 'triage-s', 'shopp', 80, 80),
        D('blog', 'triage-s', 'nginx:1.25', 1), S('blog', 'triage-s', 'blog', 80, 8080),
        D('docs', 'triage-s', 'nginx:1.25', 1, '        readinessProbe:\n          httpGet:\n            path: /ready\n            port: 80\n'), S('docs', 'triage-s', 'docs', 80, 80)],
      tasks: [
        T('`tester` reaches `shop:80`', ['`kubectl get endpoints shop -n triage-s` is empty. Compare the Service selector with the pod labels.'], [{ t: 'curl', ns: 'triage-s', from: 'tester', to: 'shop:80' }]),
        T('`tester` reaches `blog:80`', ['The Endpoints list has an address but traffic does not arrive: look at the Service `targetPort`.', 'nginx listens on 80, not 8080.'], [{ t: 'curl', ns: 'triage-s', from: 'tester', to: 'blog:80' }]),
        T('`tester` reaches `docs:80`', ['The pod is Running but not Ready, so it is left out of the Endpoints. `kubectl describe pod -l app=docs -n triage-s` shows the readiness probe failing.', 'nginx has no `/ready`. Probe `/`.'], [{ t: 'curl', ns: 'triage-s', from: 'tester', to: 'docs:80' }])
      ],
      solution: ['kubectl get endpoints -n triage-s', `kubectl patch svc shop -n triage-s --type=json -p '[{"op":"replace","path":"/spec/selector/app","value":"shop"}]'`, `kubectl patch svc blog -n triage-s --type=json -p '[{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'`, `kubectl patch deploy docs -n triage-s --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/"}]'`, 'kubectl get endpoints -n triage-s'] }),

    // ── S232 CreateContainerConfigError: three different causes ──
    L({ id: 's232-configerror-three-causes', num: 'S232', title: 'Symptom set: three CreateContainerConfigError pods, three different causes', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '15 min', ns: 'triage-k',  symptomSet: 'configerror',
      story: 'Three Deployments in `triage-k` (`front`, `jobs` and `mail`, one pod each) sit in `CreateContainerConfigError`. One refers to a ConfigMap that does not exist, one asks for a key that its Secret does not hold, and one has both objects right but a typo in the key name. The Events say which is which. Get all three Ready without changing the Deployments\' purpose: fix the objects or the references.',
      caution: 'The status is the same for a missing object and a missing key: read the exact message. A missing key is fixed on the object that should hold it, or in the reference that spelled it wrong, never by deleting the `valueFrom`.',
      setup: [NSY('triage-k'),
        D('front', 'triage-k', 'nginx:1.25', 1, '        envFrom:\n        - configMapRef:\n            name: front-config\n'),
        Y('apiVersion: v1', 'kind: Secret', 'metadata:', '  name: jobs-secret', '  namespace: triage-k', 'stringData:', '  TOKEN: abc123'),
        D('jobs', 'triage-k', 'nginx:1.25', 1, '        env:\n        - name: API_KEY\n          valueFrom:\n            secretKeyRef:\n              name: jobs-secret\n              key: API_KEY\n'),
        Y('apiVersion: v1', 'kind: ConfigMap', 'metadata:', '  name: mail-config', '  namespace: triage-k', 'data:', '  smtp_host: mail.internal'),
        D('mail', 'triage-k', 'nginx:1.25', 1, '        env:\n        - name: SMTP_HOST\n          valueFrom:\n            configMapKeyRef:\n              name: mail-config\n              key: SMTP_HOST\n')],
      tasks: [
        T('`front` is Ready', ['"configmap \\"front-config\\" not found". Create the ConfigMap with at least one key.'], [{ t: 'podsReady', ns: 'triage-k', sel: 'app=front', min: 1 }]),
        T('`jobs` is Ready', ['The Secret exists but has `TOKEN`, not `API_KEY`. The Deployment asks for `API_KEY`.', 'Add the key `API_KEY` to the Secret (keep `TOKEN`).'], [{ t: 'podsReady', ns: 'triage-k', sel: 'app=jobs', min: 1 }, { t: 'exists', ref: 'secret/jobs-secret', ns: 'triage-k' }]),
        T('`mail` is Ready', ['The ConfigMap key is `smtp_host` in lower case; the Deployment asks for `SMTP_HOST`. Keys are case sensitive.', 'Change the reference in the Deployment to the key that exists.'], [{ t: 'podsReady', ns: 'triage-k', sel: 'app=mail', min: 1 }, { t: 'jp', ref: 'cm/mail-config', ns: 'triage-k', path: '.data.smtp_host', eq: 'mail.internal' }])
      ],
      solution: ['kubectl get pods -n triage-k', 'kubectl create configmap front-config -n triage-k --from-literal=MODE=prod', 'kubectl create secret generic jobs-secret -n triage-k --from-literal=TOKEN=abc123 --from-literal=API_KEY=demo-key --dry-run=client -o yaml | kubectl apply -f -', `kubectl patch deploy mail -n triage-k --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/env/0/valueFrom/configMapKeyRef/key","value":"smtp_host"}]'`, 'kubectl get pods -n triage-k'] }),

    // ── S233 noisy namespace: fix the one real fault, leave the decoys alone ──
    L({ id: 's233-noisy-namespace', num: 'S233', title: 'A noisy namespace: fix the one real fault, leave the rest alone', diff: 'Advanced', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '20 min', ns: 'depot',
      story: 'Users report that `checkout` in namespace `depot` cannot be reached by the `tester` pod on port 80. Namespace `depot` also holds things that look wrong but are fine: a suspended CronJob `audit-export` (paused on purpose for the quarter), a finished Job `migrate-v2`, and a Deployment `gpu-batch` that stays Pending because no node has a GPU yet, which is expected. Restore `checkout` and change nothing else.',
      caution: 'A good triage leaves intentional oddities alone. A suspended CronJob, a completed Job and a Pending GPU pod are not the outage. "Fixing" them can wake up an export or start a second migration. Fix only what blocks `checkout`.',
      setup: [NSY('depot'), Labs.y.tester('depot'),
        D('checkout', 'depot', 'nginx:1.25', 2), S('checkout', 'depot', 'checkout', 80, 8081),
        D('gpu-batch', 'depot', 'nginx:1.25', 1, '', '      nodeSelector:\n        accelerator: gpu\n'),
        Y('apiVersion: batch/v1', 'kind: CronJob', 'metadata:', '  name: audit-export', '  namespace: depot', 'spec:', '  schedule: "0 2 * * *"', '  suspend: true', '  jobTemplate:', '    spec:', '      template:', '        spec:', '          restartPolicy: Never', '          containers:', '          - name: export', '            image: busybox:1.36', '            command: ["sh", "-c", "echo export"]'),
        Y('apiVersion: batch/v1', 'kind: Job', 'metadata:', '  name: migrate-v2', '  namespace: depot', 'spec:', '  template:', '    spec:', '      restartPolicy: Never', '      containers:', '      - name: migrate', '        image: busybox:1.36', '        command: ["sh", "-c", "echo migrated"]')],
      tasks: [
        T('`tester` reaches `checkout:80`', ['`kubectl get events -n depot` is full of noise. Start from the symptom instead: `kubectl get endpoints checkout -n depot`.', 'The pods are fine; the Service sends traffic to a port nothing listens on. nginx listens on 80.'], [{ t: 'curl', ns: 'depot', from: 'tester', to: 'checkout:80' }]),
        T('The decoys are untouched', ['Do not unsuspend the CronJob, do not delete the Job, do not give `gpu-batch` a different selector.'], [{ t: 'jp', ref: 'cronjob/audit-export', ns: 'depot', path: '.spec.suspend', eq: 'true' }, { t: 'exists', ref: 'job/migrate-v2', ns: 'depot' }, { t: 'jp', ref: 'deploy/gpu-batch', ns: 'depot', path: '.spec.template.spec.nodeSelector.accelerator', eq: 'gpu' }])
      ],
      solution: ['kubectl get endpoints checkout -n depot', `kubectl patch svc checkout -n depot --type=json -p '[{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'`, 'kubectl get endpoints checkout -n depot'] })
  ]);
  if (KL.COMP) KL.COMP.add({ 's229-pending-three-causes': 'cka-sched cka-pod cka-storage', 's230-crashloop-three-causes': 'cka-pod cka-logs ckad-debug', 's231-noendpoints-three-causes': 'cka-svc ckad-svc', 's232-configerror-three-causes': 'cka-pod ckad-config', 's233-noisy-namespace': 'cka-pod cka-svc cka-logs ckad-debug' });
})(typeof window !== 'undefined' ? window : globalThis);
