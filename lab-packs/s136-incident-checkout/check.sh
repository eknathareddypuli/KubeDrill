#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: checkout is down (four faults, one symptom) (s136-incident-checkout)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Symptom 1: both `checkout` pods are Running and Ready'
chk 'Symptom 1: both `checkout` pods are Running and Ready' '[ "$(kubectl get pods -n inc-checkout -l app=checkout -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Task 2: Symptom 2: the Service has endpoints'
chk 'Symptom 2: the Service has endpoints' '[ "$(kubectl get endpoints checkout -n inc-checkout -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 2 ]'
echo 'Task 3: Symptom 3: `tester` gets an answer from `checkout`'
chk 'Symptom 3: `tester` gets an answer from `checkout`' 'kubectl exec -n inc-checkout tester -- wget -qO- -T 3 checkout:80 >/dev/null 2>&1'
echo 'Constraint: Keep the namespace default-deny policy in place.'
chk 'Keep the namespace default-deny policy in place.' 'kubectl get networkpolicy/default-deny -n inc-checkout >/dev/null 2>&1 && [ "$(kubectl get networkpolicy/default-deny -n inc-checkout -o jsonpath='\''{.spec.policyTypes[0]}'\'' 2>/dev/null)" = '\''Ingress'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
