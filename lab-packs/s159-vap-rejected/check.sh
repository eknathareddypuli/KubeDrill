#!/usr/bin/env bash
# KubeDrill lab pack: Your deployment is rejected by an admission policy (s159-vap-rejected)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Deployment `web` exists with at most 4 replicas'
chk 'Deployment `web` exists with at most 4 replicas' 'kubectl get deployment/web -n teamx >/dev/null 2>&1 && { o="$(kubectl -n teamx scale deployment web --replicas=9 --dry-run=server 2>&1)"; r=$?; [ $r -ne 0 ] && printf %s "$o" | grep -Eiq '\''at most 4'\''; }'
echo 'Task 2: It carries an `owner` label and a registry.k8s.io image'
chk 'It carries an `owner` label and a registry.k8s.io image' 'echo "$(kubectl get deployment/web -n teamx -o jsonpath='\''{.metadata.labels.owner}'\'' 2>/dev/null)" | grep -Eq -- '\''.+'\'' && echo "$(kubectl get deployment/web -n teamx -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" | grep -Eq -- '\''^registry\.k8s\.io/'\'''
echo 'Task 3: All pods are Ready'
chk 'All pods are Ready' '[ "$(kubectl get pods -n teamx -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo 'Constraint: Do not modify or delete the policy or the binding.'
chk 'Do not modify or delete the policy or the binding.' 'kubectl get validatingadmissionpolicy/team-rules >/dev/null 2>&1 && [ "$(kubectl get validatingadmissionpolicybinding/team-rules-teamx -o jsonpath='\''{.spec.validationActions[0]}'\'' 2>/dev/null)" = '\''Deny'\'' ] && echo "$(kubectl get validatingadmissionpolicy/team-rules -o jsonpath='\''{.spec.validations[*].expression}'\'' 2>/dev/null)" | grep -Eq -- '\''replicas <= 4'\'''
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
