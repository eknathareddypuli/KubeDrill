/* Field Guide additions: more concept animations (Visualize page), two troubleshooting flowcharts, one more fictional "3 a.m. page" episode.
   Concepts and flows describe how Kubernetes works; no real incident is described here. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {};
  function row(labels, cls) { return labels.map(function (l, i) { return { l: l, c: (cls && cls[i]) || '' }; }); }
  KL.concepts = KL.concepts || []; KL.flows = KL.flows || []; KL.stories = KL.stories || [];
  KL.concepts.push(
    { id: 'sched', title: 'How the scheduler picks a node', steps: [
      { t: '1 · Pending pod', items: row(['node-a', 'node-b', 'node-c', 'node-d']), note: 'A pod with no node name is queued. The scheduler looks at every node.' },
      { t: '2 · Filter', items: row(['node-a', 'node-b', 'node-c', 'node-d'], ['dim', 'ok', 'ok', 'dim']), note: 'Nodes that cannot run the pod drop out: not enough CPU or memory, an untolerated taint, a selector or affinity that does not match.' },
      { t: '3 · Score', items: row(['node-a', 'node-b', 'node-c', 'node-d'], ['dim', 'hot', 'ok', 'dim']), note: 'The remaining nodes are ranked, for example by how much room they have and whether the image is already there.' },
      { t: '4 · Bind', items: row(['node-a', 'node-b', 'node-c', 'node-d'], ['dim', 'hot', 'dim', 'dim']), note: 'The scheduler writes the chosen node into the pod through the API server. If every node was filtered out the pod stays Pending and an event says why.' }] },
    { id: 'svcep', title: 'Service to endpoints: why traffic does not arrive', steps: [
      { t: '1 · Selector', items: row(['Service', 'pod app=web', 'pod app=web', 'pod app=cache']), note: 'The Service selector picks pods by label. Pods with other labels are not part of it.' },
      { t: '2 · Ready only', items: row(['Service', 'Ready', 'NotReady', 'other label'], ['hot', 'ok', 'wait', 'dim']), note: 'Only pods that pass their readiness probe appear in the endpoints. A NotReady pod gets no traffic.' },
      { t: '3 · Port', items: row(['Service port 80', 'targetPort 8080', 'app listens 80'], ['hot', 'wait', 'ok']), note: 'targetPort must match the port the container really listens on. A mismatch gives a Service with endpoints that still fails.' },
      { t: '4 · Check', items: row(['get endpoints', 'get pods --show-labels', 'describe svc'], ['ok', 'ok', 'ok']), note: 'Empty endpoints mean selector or readiness. Filled endpoints with failures mean port, NetworkPolicy or the app.' }] },
    { id: 'rbac', title: 'RBAC: how a request is allowed', steps: [
      { t: '1 · Who', items: row(['User / ServiceAccount', 'Groups'], ['hot', '']), note: 'The API server first authenticates the caller: a certificate, a token, or a ServiceAccount.' },
      { t: '2 · Bindings', items: row(['RoleBinding', 'ClusterRoleBinding'], ['hot', 'ok']), note: 'It looks for bindings that name that subject. A RoleBinding counts only inside its namespace, even when it points to a ClusterRole.' },
      { t: '3 · Rules', items: row(['verbs', 'resources', 'resourceNames'], ['ok', 'ok', 'ok']), note: 'A rule must match the verb, the resource and, when given, the object name. There are only allow rules; there is no deny.' },
      { t: '4 · Decision', items: row(['Allowed', 'Forbidden'], ['ok', 'dim']), note: 'If no rule matches, the answer is Forbidden. Creating bindings for a role also needs the permissions in it, or the bind verb on that role.' }] },
    { id: 'netpolpeer', title: 'NetworkPolicy peers: AND or OR', steps: [
      { t: 'Two items = OR', items: row(['namespaceSelector', 'podSelector'], ['ok', 'ok']), note: 'Written as two list items, a peer matches if it fits either one: any pod in that namespace, or any pod with the label in the policy namespace.' },
      { t: 'One item = AND', items: row(['namespaceSelector + podSelector'], ['hot']), note: 'Written in one item, a peer must be in that namespace and carry that label. This is usually what people mean.' },
      { t: 'Policies add up', items: row(['policy 1', 'policy 2', 'allowed = both'], ['ok', 'ok', 'hot']), note: 'All policies that select a pod are combined. You cannot block with a second policy what a first one allows: narrow the first.' },
      { t: 'Test it', items: row(['allowed client', 'same-namespace client', 'wrong-label client'], ['ok', 'dim', 'dim']), note: 'Connect from a client that should work and from each one that should not. Reading the YAML is not a test.' }] },
    { id: 'stspart', title: 'StatefulSet partition: a canary by ordinal', steps: [
      { t: 'Before', items: row(['web-0 v1', 'web-1 v1', 'web-2 v1', 'web-3 v1'], ['ok', 'ok', 'ok', 'ok']), note: 'Four pods on the old revision.' },
      { t: 'partition: 3', items: row(['web-0 v1', 'web-1 v1', 'web-2 v1', 'web-3 v2'], ['ok', 'ok', 'ok', 'hot']), note: 'Only ordinals at or above 3 are updated. The controller works from the highest ordinal down and waits for each pod to be Ready.' },
      { t: 'Lower it', items: row(['web-0 v1', 'web-1 v1', 'web-2 v2', 'web-3 v2'], ['ok', 'ok', 'hot', 'ok']), note: 'Setting partition 2 releases web-2. Set 0 to finish. rollout status says complete at each stop; that only refers to the partition.' },
      { t: 'Done', items: row(['web-0 v2', 'web-1 v2', 'web-2 v2', 'web-3 v2'], ['ok', 'ok', 'ok', 'ok']), note: 'Deleting a pod below the partition brings it back on the old revision, so move the partition rather than delete pods.' }] },
    { id: 'ndots', title: 'Pod DNS: what ndots does', steps: [
      { t: '1 · Name', items: row(['api.partner.example.com']), note: 'A pod asks for a name with three dots. The default ndots is 5.' },
      { t: '2 · Search list', items: row(['…svc.cluster.local', '…cluster.local', '…example.com', 'absolute name'], ['dim', 'dim', 'dim', 'wait']), note: 'Fewer dots than ndots, so each search domain is tried first and fails before the real name is tried.' },
      { t: '3 · ndots: 1', items: row(['absolute name first'], ['ok']), note: 'dnsConfig options ndots 1 sends names with a dot straight out. Short Service names still work because they have no dot.' }] }
  );
  KL.flows.push(
    { id: 'forbidden', title: 'Forbidden: who is denied what', start: 'f1', nodes: {
      f1: { q: 'Does the message name a user or a ServiceAccount and a verb and resource?', cmd: 'kubectl <your command> 2>&1 | head', opts: [['Yes, it names them', 'f2'], ['It says Unauthorized / must be logged in', 'L_auth']] },
      f2: { q: 'Does the identity have a binding in this namespace?', cmd: 'kubectl get rolebinding,clusterrolebinding -A -o wide | grep <name>', opts: [['No binding', 'L_nobind'], ['A binding exists', 'f3']] },
      f3: { q: 'Does the bound role allow that verb on that resource?', cmd: 'kubectl auth can-i <verb> <resource> -n <ns> --as <subject>', opts: [['Role lacks the rule', 'L_rule'], ['It can, but creating bindings is refused', 'L_bind']] },
      L_auth: { leaf: 1, title: 'Credentials, not permissions', fix: 'The API server does not know who you are: an expired certificate, a wrong kubeconfig context, or an expired token.', lab: 's73-expired-certs', caution: 'Do not widen RBAC for an authentication failure; it will not help and gives away access.' },
      L_nobind: { leaf: 1, title: 'No binding for the subject', fix: 'Create the smallest binding that fits, in the namespace where it is needed. A missing ServiceAccount also blocks pods being created.', lab: 's218-missing-sa-view', caution: 'A ClusterRoleBinding grants in every namespace. Use a RoleBinding unless you mean it.' },
      L_rule: { leaf: 1, title: 'Role is missing a rule', fix: 'Add only the verb and resource that were refused, with resourceNames when it is one object.', lab: 's11-rbac-sa', caution: 'Do not use a wildcard to make the error disappear.' },
      L_bind: { leaf: 1, title: 'Cannot grant what you do not hold', fix: 'Allow the bind verb on that one role, by name, instead of copying its permissions.', lab: 's212-rbac-bind', caution: 'The escalate verb or a wildcard lets the subject grant anything.' } } },
    { id: 'netblock', title: 'Pods cannot reach each other', start: 'n1', nodes: {
      n1: { q: 'Does it work by pod IP, but not by Service name?', cmd: 'kubectl exec <pod> -- wget -qO- -T 2 <pod-ip>', opts: [['Pod IP works, name fails', 'L_dns'], ['Both fail', 'n2'], ['Both work from some pods, not others', 'n3']] },
      n2: { q: 'Is there a NetworkPolicy selecting the destination?', cmd: 'kubectl get netpol -n <ns>', opts: [['Yes', 'n3'], ['No policy', 'L_svc']] },
      n3: { q: 'Which clients are allowed by the policy list?', cmd: 'kubectl get netpol <name> -n <ns> -o yaml', opts: [['Too many clients get through', 'L_andor'], ['Needed client is blocked: other namespace', 'L_ns'], ['Needed client is blocked: egress', 'L_egress']] },
      L_dns: { leaf: 1, title: 'DNS or search path', fix: 'Check the pod resolv.conf, CoreDNS pods and the name you used. Names with several dots can be slow because of ndots.', lab: 's211-ndots-dnsconfig', caution: 'Do not restart CoreDNS on a shared cluster before reading its logs.' },
      L_svc: { leaf: 1, title: 'Service has no healthy endpoints', fix: 'Compare selector and labels, readiness, and targetPort.', lab: 's04-no-endpoints', caution: 'Do not loosen readiness to force traffic through.' },
      L_andor: { leaf: 1, title: 'Peers ORed instead of ANDed', fix: 'A namespaceSelector and a podSelector in separate list items admit either one. Put both in the same item and test each client.', lab: 's217-netpol-and-or', caution: 'Adding a second policy cannot remove what the first allows.' },
      L_ns: { leaf: 1, title: 'Other namespace not selected', fix: 'Label the source namespace and select it with namespaceSelector; a podSelector alone only matches the policy namespace.', lab: 's52-netpol-namespace', caution: 'Check namespace labels first: names are matched by label, not by name.' },
      L_egress: { leaf: 1, title: 'Egress policy blocks the client', fix: 'The client namespace has an egress policy. Allow the destination and also DNS (port 53) when names are used.', lab: 's51-netpol-egress', caution: 'Do not open egress to 0.0.0.0/0 to make the test pass.' } } }
  );
  KL.stories.push({ id: 'ep4', title: 'Episode 4 — Locked Down, Locked Out', blurb: 'A security sweep goes out on Thursday. By Friday morning three teams cannot deploy.', chapters: [
    { lab: 's219-runasnonroot', time: '07:10', page: 'Slack: “web in hardened has been in CreateContainerConfigError since the policy change.”', note: 'The control must stay. Satisfy it.' },
    { lab: 's218-missing-sa-view', time: '08:05', page: 'Ticket: “reporter has no pods; it says it cannot find a service account.”', note: 'Give it an identity with the least access it needs.' },
    { lab: 's217-netpol-and-or', time: '09:30', page: 'Security review: “scratch pods in ops can still reach the vault store.”', note: 'The policy was written to allow one client. Find out why more get in.' }] });
})(typeof window !== 'undefined' ? window : globalThis);
