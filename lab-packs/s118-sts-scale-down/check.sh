#!/usr/bin/env bash
# KubeDrill lab pack: StatefulSet scale-down: what happens to the volumes? (s118-sts-scale-down)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Scale `db` down to 2 replicas'
chk 'Scale `db` down to 2 replicas' '[ "$(kubectl get sts/db -n ledger -o jsonpath='\''{.spec.replicas}'\'' 2>/dev/null)" = '\''2'\'' ] && [ "$(kubectl get pods -n ledger -l app=db -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ] && [ "$(kubectl get pods -n ledger -l app=db -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -le 2 ]'
echo 'Task 2: Release the storage of the retired replica'
chk 'Release the storage of the retired replica' '! kubectl get pvc/data-db-2 -n ledger >/dev/null 2>&1'
echo 'Task 3: `db-1` is still bound to its original volume'
chk '`db-1` is still bound to its original volume' '[ "$(kubectl get pvc/data-db-1 -n ledger -o jsonpath='\''{.status.phase}'\'' 2>/dev/null)" = '\''Bound'\'' ]'
echo 'Constraint: Never delete the claims of `db-0` or `db-1`.'
chk 'Never delete the claims of `db-0` or `db-1`.' 'kubectl get pvc/data-db-0 -n ledger >/dev/null 2>&1 && kubectl get pvc/data-db-1 -n ledger >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
