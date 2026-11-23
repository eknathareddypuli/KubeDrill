#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKS): harden the payments namespace (s172-capstone-cks)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: The namespace enforces `restricted`'
chk 'The namespace enforces `restricted`' '[ "$(kubectl get ns/cap-cks -o jsonpath='\''{.metadata.labels.pod-security\.kubernetes\.io/enforce}'\'' 2>/dev/null)" = '\''restricted'\'' ]'
echo 'Task 2: `pay` meets the `restricted` profile and is Ready'
chk '`pay` meets the `restricted` profile and is Ready' '[ "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.runAsNonRoot}'\'' 2>/dev/null)" = '\''true'\'' ] && [ "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation}'\'' 2>/dev/null)" = '\''false'\'' ] && echo "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.capabilities.drop[*]}'\'' 2>/dev/null)" | grep -Eq -- '\''ALL'\'' && [ "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.securityContext.seccompProfile.type}'\'' 2>/dev/null)" = '\''RuntimeDefault'\'' ] && [ "$(kubectl get pods -n cap-cks -l app=pay -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo 'Task 3: The `default` ServiceAccount has no cluster-wide power'
chk 'The `default` ServiceAccount has no cluster-wide power' '[ "$(kubectl auth can-i list secrets --as=system:serviceaccount:cap-cks:default -n cap-cks 2>/dev/null)" = no ]'
echo 'Task 4: Only `gateway` reaches `pay`'
chk 'Only `gateway` reaches `pay`' 'kubectl exec -n cap-cks gateway -- wget -qO- -T 3 pay:80 >/dev/null 2>&1 && ! kubectl exec -n cap-cks intruder -- wget -qO- -T 3 pay:80 >/dev/null 2>&1'
echo 'Task 5: The Secret is a read-only volume at `/etc/pay`, not an environment variable'
chk 'The Secret is a read-only volume at `/etc/pay`, not an environment variable' 'echo "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.volumes[*].secret.secretName}'\'' 2>/dev/null)" | grep -Eq -- '\''pay-key'\'' && [ "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.containers[0].volumeMounts[0].mountPath}'\'' 2>/dev/null)" = '\''/etc/pay'\'' ] && [ "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.containers[0].volumeMounts[0].readOnly}'\'' 2>/dev/null)" = '\''true'\'' ] && echo "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.containers[0].env[*].valueFrom.secretKeyRef.name}'\'' 2>/dev/null)" | grep -Eq -- '\''^$'\'''
echo 'Task 6: The privileged pod is gone'
chk 'The privileged pod is gone' '! kubectl get pod/debug-tools -n cap-cks >/dev/null 2>&1'
echo 'Task 7: The image is pinned to `1.25`'
chk 'The image is pinned to `1.25`' '[ "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginxinc/nginx-unprivileged:1.25'\'' ]'
echo 'Task 8: `pay` does not automount a service account token'
chk '`pay` does not automount a service account token' '[ "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.automountServiceAccountToken}'\'' 2>/dev/null)" = '\''false'\'' ]'
echo 'Task 9: The admission policy is enforced here'
chk 'The admission policy is enforced here' '{ o="$(kubectl -n cap-cks create deployment probe-latest --image=nginx:latest --dry-run=server 2>&1)"; r=$?; [ $r -ne 0 ] && printf %s "$o" | grep -Eiq '\''denied request'\''; }'
echo 'Task 10: `pay` has CPU and memory limits'
chk '`pay` has CPU and memory limits' 'echo "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.containers[0].resources.limits.cpu}'\'' 2>/dev/null)" | grep -Eq -- '\''.+'\'' && echo "$(kubectl get deployment/pay -n cap-cks -o jsonpath='\''{.spec.template.spec.containers[0].resources.limits.memory}'\'' 2>/dev/null)" | grep -Eq -- '\''.+'\'''
echo 'Constraint: Keep the Secret `pay-key` and the Deployment `pay` (fix them in place), and keep the Service `pay`.'
chk 'Keep the Secret `pay-key` and the Deployment `pay` (fix them in place), and keep the Service `pay`.' 'kubectl get secret/pay-key -n cap-cks >/dev/null 2>&1 && kubectl get deployment/pay -n cap-cks >/dev/null 2>&1 && kubectl get service/pay -n cap-cks >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
