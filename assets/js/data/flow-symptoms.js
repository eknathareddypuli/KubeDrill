/* Flowcharts per symptom for the symptom-set labs (S229-S232) plus rollouts that never finish.
   Guidance only: commands are copy-only and the cautions say what not to do on a shared cluster. Labs listed are simulator labs. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {}; KL.flows = KL.flows || [];
  KL.flows.push(
    { id: 'pend-set', title: 'Pending: which of three causes?', start: 'a1', nodes: {
      a1: { q: 'What does the Events section of the pod say?', cmd: 'kubectl describe pod <pod> -n <ns> | sed -n "/Events:/,\\$p"', opts: [['didn\'t match Pod\'s node affinity/selector', 'L_sel'], ['Insufficient cpu or memory', 'L_req'], ['unbound immediate PersistentVolumeClaims', 'a2']] },
      a2: { q: 'Does the claim name a StorageClass that exists?', cmd: 'kubectl get pvc <pvc> -n <ns> -o jsonpath="{.spec.storageClassName}"; kubectl get storageclass', opts: [['No such class', 'L_cls'], ['Class exists, still unbound', 'L_pv']] },
      L_sel: { leaf: 1, title: 'Selector no node satisfies', fix: 'Compare the pod\'s nodeSelector with `kubectl get nodes --show-labels`. The selector is usually the mistake, not the nodes.', lab: 's229-pending-three-causes', caution: 'Labelling a shared node changes scheduling for everyone who selects on that label.' },
      L_req: { leaf: 1, title: 'Request larger than any node', fix: 'Read the request in the pod spec and compare with `kubectl describe node`. A typo such as Gi for Mi is common.', lab: 's229-pending-three-causes', caution: 'Cutting a request without measuring trades Pending for throttling or OOM kills.' },
      L_cls: { leaf: 1, title: 'Claim names a missing StorageClass', fix: 'A claim\'s class cannot be edited after creation. Export it, change the class, delete and recreate it, and check nothing needs the old data first.', lab: 's229-pending-three-causes', caution: 'Deleting a claim can delete the volume depending on the reclaim policy. Read it first.' },
      L_pv: { leaf: 1, title: 'No matching volume', fix: 'Check access mode, size and class against the available PersistentVolumes.', lab: 's13-pvc-pending', caution: 'Do not delete a PV to unstick a claim.' } } },

    { id: 'crash-set', title: 'CrashLoopBackOff: which of three causes?', start: 'b1', nodes: {
      b1: { q: 'What is the last state of the container?', cmd: 'kubectl describe pod <pod> -n <ns> | grep -A6 "Last State"', opts: [['OOMKilled', 'L_oom'], ['Error, exit code non-zero', 'b2'], ['Restarted by the kubelet, no error in logs', 'L_probe']] },
      b2: { q: 'Do the previous logs name the problem?', cmd: 'kubectl logs <pod> -n <ns> --previous', opts: [['Yes: bad command, config or missing file', 'L_cmd'], ['Empty', 'L_probe']] },
      L_oom: { leaf: 1, title: 'Memory limit too low', fix: 'Compare the limit with real use and raise it by a measured amount.', lab: 's230-crashloop-three-causes', caution: 'Raising limits everywhere hides leaks and can starve neighbours.' },
      L_probe: { leaf: 1, title: 'Liveness probe kills a healthy app', fix: 'Check the probe path, port and initial delay. A slow starter needs a startup probe or more delay.', lab: 's230-crashloop-three-causes', caution: 'Removing the probe fixes the symptom and removes self-healing.' },
      L_cmd: { leaf: 1, title: 'The process itself exits', fix: 'Read the command, args and mounted config. Fix the thing the log names.', lab: 's230-crashloop-three-causes', caution: 'Do not paste secrets from the log into a ticket.' } } },

    { id: 'noep-set', title: 'Service answers nothing: which of three causes?', start: 'd1', nodes: {
      d1: { q: 'Is the Endpoints list empty?', cmd: 'kubectl get endpoints <svc> -n <ns>', opts: [['Empty', 'd2'], ['Has an address, traffic still fails', 'L_port']] },
      d2: { q: 'Do the Service selector and the pod labels match?', cmd: 'kubectl get svc <svc> -n <ns> -o jsonpath="{.spec.selector}"; kubectl get pods -n <ns> --show-labels', opts: [['They differ', 'L_sel'], ['They match, pods Running but not Ready', 'L_ready']] },
      L_sel: { leaf: 1, title: 'Selector does not match the labels', fix: 'Change the Service selector or the pod template labels so they agree. A template change rolls the pods.', lab: 's231-noendpoints-three-causes', caution: 'Changing pod labels on a live Deployment restarts every pod. Prefer fixing the Service.' },
      L_port: { leaf: 1, title: 'targetPort is wrong', fix: 'The Service sends to a port nothing listens on. Use the port the container really listens on.', lab: 's231-noendpoints-three-causes', caution: 'Check the container port in the image docs, not the Service port.' },
      L_ready: { leaf: 1, title: 'Readiness probe failing', fix: 'The pod is left out of Endpoints until it is Ready. Fix the probe path or port.', lab: 's231-noendpoints-three-causes', caution: 'Loosening readiness sends traffic to broken pods.' } } },

    { id: 'cfg-set', title: 'CreateContainerConfigError: which of three causes?', start: 'e1', nodes: {
      e1: { q: 'What does the event say is missing?', cmd: 'kubectl describe pod <pod> -n <ns> | grep -i -B1 -A2 "error\\|not found"', opts: [['configmap not found', 'L_cm'], ['couldn\'t find key in Secret or ConfigMap', 'e2']] },
      e2: { q: 'Does the object have a similar key with different spelling or case?', cmd: 'kubectl get secret,cm <name> -n <ns> -o jsonpath="{.data}"', opts: [['A different key name (e.g. TOKEN vs API_KEY)', 'L_secret'], ['Same word, different case', 'L_case']] },
      L_cm: { leaf: 1, title: 'ConfigMap does not exist', fix: 'Create the ConfigMap in the same namespace with the keys the pod references.', lab: 's232-configerror-three-causes', caution: 'References are per namespace: a ConfigMap elsewhere does not count.' },
      L_secret: { leaf: 1, title: 'Secret lacks the key', fix: 'Add the key the pod asks for, and leave the existing key alone if something else uses it.', lab: 's232-configerror-three-causes', caution: 'Do not print secret values on a shared screen; base64 is not encryption.' },
      L_case: { leaf: 1, title: 'Key case does not match', fix: 'Keys are case sensitive. Change the reference to the key that exists, unless the ConfigMap is the one that is wrong.', lab: 's232-configerror-three-causes', caution: 'Renaming a key breaks other consumers. Search for them first.' } } },

    { id: 'rollout', title: 'Rollout never finishes', start: 'r1', nodes: {
      r1: { q: 'What does the rollout say?', cmd: 'kubectl rollout status deploy/<name> -n <ns>', opts: [['Waiting for new pods to be ready', 'r2'], ['ReplicaFailure / exceeded quota', 'L_quota'], ['Old pods are never removed', 'L_surge']] },
      r2: { q: 'What state are the new pods in?', cmd: 'kubectl get pods -n <ns> -l <selector>', opts: [['ImagePullBackOff / CrashLoop', 'L_bad'], ['Running, not Ready', 'L_ready'], ['Pending', 'L_pend']] },
      L_bad: { leaf: 1, title: 'New version is broken', fix: 'Roll back to the last good revision, then debug the new one.', lab: 's06-rollout-rollback', caution: 'A rollback also reverts config in that revision. Read the history first.' },
      L_ready: { leaf: 1, title: 'New pods fail readiness', fix: 'Check the readiness probe against what the new version really serves.', lab: 's04-no-endpoints', caution: 'Do not remove the probe to finish the rollout.' },
      L_pend: { leaf: 1, title: 'New pods cannot be scheduled', fix: 'Read the Events of a Pending pod. Surge pods need spare capacity.', lab: 's229-pending-three-causes', caution: 'Do not delete running pods to make room without checking the rollout settings.' },
      L_quota: { leaf: 1, title: 'Quota blocks the new pods', fix: 'Read the ReplicaSet events. Free quota or reduce surge, with the owner\'s agreement.', lab: 's15-quota-limits', caution: 'Raising a quota silently defeats capacity planning.' },
      L_surge: { leaf: 1, title: 'Strategy or a disruption budget holds old pods', fix: 'Check maxUnavailable, maxSurge and any PodDisruptionBudget.', lab: 's39-rollout-revision', caution: 'Setting maxUnavailable to 100% causes an outage.' } } }
  );
  // each lab gets a link to the flowchart it is a leaf of
  function idx() { var m = {}; KL.flows.forEach(function (f, i) { Object.keys(f.nodes).forEach(function (k) { var n = f.nodes[k]; if (n.leaf && n.lab) { (m[n.lab] = m[n.lab] || []); if (m[n.lab].map(function (x) { return x.i; }).indexOf(i) < 0) m[n.lab].push({ i: i, t: f.title }); } }); }); return m; }
  KL.flowIndex = idx;
  window.addEventListener('kl:runner', function () {
    setTimeout(function () {
      var r = KL.runner && KL.runner.cur(); if (!r || document.getElementById('lfFlow')) return; var id = r.lab.variantOf || r.lab.id, hit = idx()[id]; if (!hit || !document.getElementById('lrTasks')) return;
      var el = document.createElement('div'); el.id = 'lfFlow'; el.className = 'lf-flowlink'; el.innerHTML = '🧭 Flowchart: ' + hit.map(function (h) { return '<a href="#field" data-fi="' + h.i + '">' + h.t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</a>'; }).join(' · ');
      el.addEventListener('click', function (e) { var a = e.target.closest('a[data-fi]'); if (!a) return; setTimeout(function () { var b = document.querySelector('[data-t="flows"]'); if (b) { KL.flowSel(+a.dataset.fi); b.click(); } }, 250); });
      var t = document.getElementById('lrTasks'); t.parentNode.insertBefore(el, t);
    }, 90);
  });
})();
