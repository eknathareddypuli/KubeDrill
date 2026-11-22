/* Labs S140–S146.
   S140–S142  WORKED EXAMPLES ("watch, then do"): a demo workload has the same fault as yours. The Worked example panel runs the
              expert's commands in your terminal one step at a time with narration; then you repeat the pattern on `mine`.
   S143–S146  YAML REPAIR: a broken manifest file in /home/student. Fix the FILE, then apply it. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js');
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); o.curriculum = true; return o; }
  function Y() { return Array.prototype.slice.call(arguments).join('\n') + '\n'; }
  function NS(n) { return Y('apiVersion: v1', 'kind: Namespace', 'metadata:', '  name: ' + n); }
  function dep(name, ns, image, extra) { return Y('apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: ' + name, '  namespace: ' + ns, 'spec:', '  replicas: 2', '  selector:', '    matchLabels:', '      app: ' + name, '  template:', '    metadata:', '      labels:', '        app: ' + name, '    spec:', '      containers:', '      - name: c', '        image: ' + image) + (extra || ''); }
  function svc(name, ns, sel) { return Y('apiVersion: v1', 'kind: Service', 'metadata:', '  name: ' + name, '  namespace: ' + ns, 'spec:', '  selector:', '    app: ' + sel, '  ports:', '  - port: 80', '    targetPort: 80'); }
  var WORKED = 'Worked example: press <b>Run next step</b> in the panel and watch each command and why it is used. Then repeat the same pattern on your own workload.';

  Labs.register([
    L({ id: 's140-worked-imagepull', num: 'S140', title: 'Worked example: ImagePullBackOff (watch, then do)', diff: 'Beginner', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '10 min', ns: 'we-image',
      story: 'Two Deployments sit in `we-image`: `demo` and `mine`. Both have pods in ImagePullBackOff. ' + WORKED + ' Your job is to fix `mine`.',
      caution: 'The fix is a tag that exists in the registry. Do not guess tags: read the failing one in the Events first.',
      worked: { steps: [
        { say: 'Start with the symptom. Status column first, never edit before you have read it.', cmd: 'kubectl get pods -n we-image -l app=demo' },
        { say: 'Events explain the status. Look for "Failed to pull image" and read the tag.', cmd: 'kubectl describe pod -n we-image -l app=demo' },
        { say: 'The tag 1.255 does not exist. Change only the image, nothing else.', cmd: 'kubectl set image deployment/demo c=nginx:1.25 -n we-image' },
        { say: 'Prove it: the rollout finishes and pods go Ready.', cmd: 'kubectl rollout status deployment/demo -n we-image' }] },
      setup: [NS('we-image'), dep('demo', 'we-image', 'nginx:1.255'), dep('mine', 'we-image', 'nginx:1.266')],
      tasks: [T('`mine` has 2 Ready pods', ['Same pattern: status, then events, then image.', '`kubectl describe pod -n we-image -l app=mine`', '`kubectl set image deployment/mine c=nginx:1.25 -n we-image`'], [{ t: 'podsReady', ns: 'we-image', sel: 'app=mine', min: 2 }])],
      solution: ['kubectl get pods -n we-image -l app=mine', 'kubectl describe pod -n we-image -l app=mine', 'kubectl set image deployment/mine c=nginx:1.25 -n we-image', 'kubectl rollout status deployment/mine -n we-image'] }),

    L({ id: 's141-worked-selector', num: 'S141', title: 'Worked example: Service with no endpoints (watch, then do)', diff: 'Beginner', track: ['CKA', 'CKAD'], domain: 'Services & Networking', time: '10 min', ns: 'we-svc',
      story: 'In `we-svc`, Services `demo` and `mine` both have healthy pods behind them and both have no endpoints. ' + WORKED + ' Your job is to fix `mine`.',
      caution: 'Fix the Service selector to match the pods; do not relabel pods that other objects may select.',
      worked: { steps: [
        { say: 'Pods are Ready, yet the Service is empty. Check the endpoints object.', cmd: 'kubectl get endpoints demo -n we-svc' },
        { say: 'What does the Service select? Compare with the pod labels next.', cmd: 'kubectl get svc demo -n we-svc -o jsonpath={.spec.selector}' },
        { say: 'Pod labels are the truth. They say app=demo, the Service says otherwise.', cmd: 'kubectl get pods -n we-svc --show-labels' },
        { say: 'Patch the selector (merge patch replaces the key), then re-check.', cmd: 'kubectl patch svc demo -n we-svc -p \'{"spec":{"selector":{"app":"demo"}}}\'' },
        { say: 'Endpoints now list pod IPs.', cmd: 'kubectl get endpoints demo -n we-svc' }] },
      setup: [NS('we-svc'), dep('demo', 'we-svc', 'nginx:1.25'), dep('mine', 'we-svc', 'nginx:1.25'), svc('demo', 'we-svc', 'demo-v2'), svc('mine', 'we-svc', 'mine-v2')],
      tasks: [T('Service `mine` has 2 endpoints', ['Selector vs labels: `kubectl get svc mine -n we-svc -o yaml` and `--show-labels`.', 'The pods carry `app=mine`.', '`kubectl patch svc mine -n we-svc -p \'{"spec":{"selector":{"app":"mine"}}}\'`'], [{ t: 'endpoints', ns: 'we-svc', svc: 'mine', min: 2 }])],
      solution: ['kubectl get svc mine -n we-svc -o jsonpath={.spec.selector}', 'kubectl get pods -n we-svc --show-labels', "kubectl patch svc mine -n we-svc -p '{\"spec\":{\"selector\":{\"app\":\"mine\"}}}'", 'kubectl get endpoints mine -n we-svc'] }),

    L({ id: 's142-worked-configmap', num: 'S142', title: 'Worked example: missing ConfigMap (watch, then do)', diff: 'Beginner', track: ['CKAD'], domain: 'Configuration', time: '10 min', ns: 'we-cfg',
      story: 'Deployments `demo` and `mine` in `we-cfg` read the env var `MODE` from a ConfigMap that does not exist, so no pod starts. ' + WORKED + ' Your job is to fix `mine`.',
      caution: 'Create the ConfigMap the Deployment already references rather than editing the Deployment: the name and key are part of the contract.',
      worked: { steps: [
        { say: 'Status first. CreateContainerConfigError means something the pod references is missing.', cmd: 'kubectl get pods -n we-cfg -l app=demo' },
        { say: 'The event names the object that is missing.', cmd: 'kubectl describe pod -n we-cfg -l app=demo' },
        { say: 'Which ConfigMap name and key does the Deployment expect?', cmd: 'kubectl get deploy demo -n we-cfg -o jsonpath={.spec.template.spec.containers[0].env}' },
        { say: 'Create exactly that name and key. Pods retry on their own.', cmd: 'kubectl create configmap demo-cfg --from-literal=mode=live -n we-cfg' },
        { say: 'Pods go Ready.', cmd: 'kubectl get pods -n we-cfg -l app=demo' }] },
      setup: [NS('we-cfg'),
        dep('demo', 'we-cfg', 'nginx:1.25', Y('        env:', '        - name: MODE', '          valueFrom:', '            configMapKeyRef:', '              name: demo-cfg', '              key: mode')),
        dep('mine', 'we-cfg', 'nginx:1.25', Y('        env:', '        - name: MODE', '          valueFrom:', '            configMapKeyRef:', '              name: mine-cfg', '              key: mode'))],
      tasks: [T('`mine` pods are Ready', ['Same pattern: describe the pod and read which ConfigMap is missing.', 'The Deployment expects ConfigMap `mine-cfg` with key `mode`.', '`kubectl create configmap mine-cfg --from-literal=mode=live -n we-cfg`'], [{ t: 'podsReady', ns: 'we-cfg', sel: 'app=mine', min: 2 }])],
      solution: ['kubectl describe pod -n we-cfg -l app=mine', 'kubectl create configmap mine-cfg --from-literal=mode=live -n we-cfg', 'kubectl get pods -n we-cfg -l app=mine'] }),

    // ── YAML repair ──
    L({ id: 's143-yaml-tab', num: 'S143', title: 'YAML repair: the tab character', diff: 'Beginner', track: ['CKA', 'CKAD'], domain: 'Core Concepts', time: '10 min', ns: 'yr-tab',
      story: '`/home/student/tabby.yaml` was pasted from a wiki and `kubectl apply -f` refuses it. Repair the file (not the cluster) and apply it so Deployment `tabby` runs 2 ready pods in `yr-tab`.',
      caution: 'YAML forbids tabs for indentation. Editors hide them; `cat -A file` shows tabs as ^I. Fix the file, keep its content, and apply it again.',
      setup: [NS('yr-tab')],
      files: [{ path: '/home/student/tabby.yaml', content: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: tabby\n  namespace: yr-tab\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: tabby\n  template:\n    metadata:\n      labels:\n        app: tabby\n    spec:\n      containers:\n\t- name: c\n\t  image: nginx:1.25\n' }],
      tasks: [T('Deployment `tabby` has 2 Ready pods', ['`kubectl apply -f /home/student/tabby.yaml` names the line.', '`cat -A /home/student/tabby.yaml` shows `^I` where tabs are.', 'Rewrite the two lines with spaces: `cat > /home/student/tabby.yaml <<\'EOF\'` ... or a sed that replaces the tab, then apply.'], [{ t: 'podsReady', ns: 'yr-tab', sel: 'app=tabby', min: 2 }])],
      solution: ["cat > /home/student/tabby.yaml <<'EOF'\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: tabby\n  namespace: yr-tab\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: tabby\n  template:\n    metadata:\n      labels:\n        app: tabby\n    spec:\n      containers:\n      - name: c\n        image: nginx:1.25\nEOF", 'kubectl apply -f /home/student/tabby.yaml'] }),

    L({ id: 's144-yaml-indent', num: 'S144', title: 'YAML repair: wrong indentation', diff: 'Beginner', track: ['CKA', 'CKAD'], domain: 'Core Concepts', time: '10 min', ns: 'yr-indent',
      story: '`/home/student/webpod.yaml` is valid YAML but kubectl rejects it: a field sits one level too high. Fix the file so Pod `webpod` runs in `yr-indent`.',
      caution: 'Valid YAML is not valid Kubernetes. The error names the field and the object it was found in: read it, then move the line, do not delete it.',
      setup: [NS('yr-indent')],
      files: [{ path: '/home/student/webpod.yaml', content: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: webpod\n  namespace: yr-indent\n  labels:\n    app: webpod\nspec:\n  containers:\n  - name: web\n  image: nginx:1.25\n' }],
      tasks: [T('Pod `webpod` is Running and Ready', ['`kubectl apply -f /home/student/webpod.yaml` → `unknown field "image"` in PodSpec.', '`image` belongs to the container (aligned with `name`), not to `spec`.', 'Indent `image:` four spaces more than `- name`… i.e. align it under `name:`, then apply.'], [{ t: 'podsReady', ns: 'yr-indent', sel: 'app=webpod', min: 1 }])],
      solution: ["cat > /home/student/webpod.yaml <<'EOF'\napiVersion: v1\nkind: Pod\nmetadata:\n  name: webpod\n  namespace: yr-indent\n  labels:\n    app: webpod\nspec:\n  containers:\n  - name: web\n    image: nginx:1.25\nEOF", 'kubectl apply -f /home/student/webpod.yaml'] }),

    L({ id: 's145-yaml-apiversion', num: 'S145', title: 'YAML repair: removed apiVersion', diff: 'Beginner', track: ['CKA', 'CKAD'], domain: 'Core Concepts', time: '10 min', ns: 'yr-api',
      story: 'An old blog post gave you `/home/student/legacy.yaml`. On a current cluster the Deployment is refused with "no matches for kind". Fix the file and deploy `legacy` (2 replicas) in `yr-api`.',
      caution: '`kubectl api-resources` and `kubectl explain deployment` tell you the group/version that exists today. Beta versions get removed, so old manifests rot.',
      setup: [NS('yr-api')],
      files: [{ path: '/home/student/legacy.yaml', content: 'apiVersion: apps/v1beta1\nkind: Deployment\nmetadata:\n  name: legacy\n  namespace: yr-api\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: legacy\n  template:\n    metadata:\n      labels:\n        app: legacy\n    spec:\n      containers:\n      - name: c\n        image: nginx:1.25\n' }],
      tasks: [T('Manifest uses `apps/v1` and Deployment `legacy` is Ready', ['`kubectl api-resources | grep deployments` shows `apps/v1`.', '`sed -i s#apps/v1beta1#apps/v1# /home/student/legacy.yaml`', 'Apply the file again.'], [{ t: 'file', path: '/home/student/legacy.yaml', has: 'apiVersion: apps/v1\n' }, { t: 'podsReady', ns: 'yr-api', sel: 'app=legacy', min: 2 }])],
      solution: ['sed -i s#apps/v1beta1#apps/v1# /home/student/legacy.yaml', 'kubectl apply -f /home/student/legacy.yaml'] }),

    L({ id: 's146-yaml-selector', num: 'S146', title: 'YAML repair: selector that matches nothing', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Workloads', time: '10 min', ns: 'yr-sel',
      story: '`/home/student/site.yaml` fails to apply: the API server says the Deployment is invalid. Repair the file and deploy `site` (2 replicas) in `yr-sel`, keeping the label `app: site` on the pods.',
      caution: 'A Deployment selector must match its template labels, and cannot be changed later on a live Deployment. Fix the file before the first apply, or delete and recreate.',
      setup: [NS('yr-sel')],
      files: [{ path: '/home/student/site.yaml', content: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: site\n  namespace: yr-sel\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: web\n  template:\n    metadata:\n      labels:\n        app: site\n    spec:\n      containers:\n      - name: c\n        image: nginx:1.25\n' }],
      constraint: { text: 'Keep the pod label `app: site`.', assert: [{ t: 'fileRe', path: '/home/student/site.yaml', re: 'app: site' }] },
      tasks: [T('Deployment `site` has 2 Ready pods', ['`kubectl apply -f /home/student/site.yaml` → selector does not match template labels.', 'Change `matchLabels` to `app: site` (the pod label stays).', 'Apply again and check `kubectl get pods -n yr-sel`.'], [{ t: 'podsReady', ns: 'yr-sel', sel: 'app=site', min: 2 }])],
      solution: ['sed -i s/app:\\ web/app:\\ site/ /home/student/site.yaml', 'kubectl apply -f /home/student/site.yaml'] })
  ]);

  if (KL.COMP) KL.COMP.add({ 's140-worked-imagepull': 'cka-pod ckad-debug', 's141-worked-selector': 'cka-svc cka-pod', 's142-worked-configmap': 'ckad-cm ckad-debug', 's143-yaml-tab': 'ckad-api ckad-imp', 's144-yaml-indent': 'ckad-api ckad-imp', 's145-yaml-apiversion': 'ckad-api ckad-deploy', 's146-yaml-selector': 'ckad-api ckad-deploy ckad-deploy' });
})(typeof window !== 'undefined' ? window : globalThis);
