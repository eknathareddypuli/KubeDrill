#!/usr/bin/env bash
# KubeDrill lab pack: Map root in the container to a harmless host user (s166-user-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: The pod template sets `hostUsers: false`'
chk 'The pod template sets `hostUsers: false`' '[ "$(kubectl get deployment/legacy -n userns -o jsonpath='\''{.spec.template.spec.hostUsers}'\'' 2>/dev/null)" = '\''false'\'' ]'
echo 'Task 2: Both pods are Ready with the new setting'
chk 'Both pods are Ready with the new setting' '[ "$(kubectl get pods -n userns -l app=legacy -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Constraint: Keep `runAsUser: 0` and the image; do not add `runAsNonRoot`.'
chk 'Keep `runAsUser: 0` and the image; do not add `runAsNonRoot`.' '[ "$(kubectl get deployment/legacy -n userns -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.runAsUser}'\'' 2>/dev/null)" = '\''0'\'' ] && [ "$(kubectl get deployment/legacy -n userns -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.25'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
