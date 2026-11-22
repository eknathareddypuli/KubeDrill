#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: frontend cannot reach backend (three layers) (s139-incident-backend)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: The `backend` pods are Running and Ready'
chk 'The `backend` pods are Running and Ready' '[ "$(kubectl get pods -n inc-net -l app=backend -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Task 2: The Service reaches the pods (port mapping)'
chk 'The Service reaches the pods (port mapping)' '[ "$(kubectl get svc/backend -n inc-net -o jsonpath='\''{.spec.ports[0].targetPort}'\'' 2>/dev/null)" = '\''80'\'' ]'
echo 'Task 3: `frontend` can fetch `backend` by name'
chk '`frontend` can fetch `backend` by name' 'kubectl exec -n inc-net frontend -- wget -qO- -T 3 backend:80 >/dev/null 2>&1'
echo 'Constraint: Keep the egress restriction on `frontend` (no allow-all rule).'
chk 'Keep the egress restriction on `frontend` (no allow-all rule).' 'kubectl get networkpolicy/frontend-egress -n inc-net >/dev/null 2>&1 && [ "$(kubectl get networkpolicy/frontend-egress -n inc-net -o jsonpath='\''{.spec.policyTypes[0]}'\'' 2>/dev/null)" = '\''Egress'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
