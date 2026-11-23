#!/usr/bin/env bash
# KubeDrill lab pack: Grow a bound PVC without losing data (s160-pvc-expand)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: The StorageClass allows expansion'
chk 'The StorageClass allows expansion' '[ "$(kubectl get sc/slow -o jsonpath='\''{.allowVolumeExpansion}'\'' 2>/dev/null)" = '\''true'\'' ]'
echo 'Task 2: The claim is 3Gi and the pod still runs'
chk 'The claim is 3Gi and the pod still runs' '[ "$(kubectl get pvc/db-data -n data -o jsonpath='\''{.spec.resources.requests.storage}'\'' 2>/dev/null)" = '\''3Gi'\'' ] && [ "$(kubectl get pvc/db-data -n data -o jsonpath='\''{.status.capacity.storage}'\'' 2>/dev/null)" = '\''3Gi'\'' ] && [ "$(kubectl get pods -n data -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo 'Task 3: Shrinking is refused'
chk 'Shrinking is refused' '{ o="$(kubectl -n data patch pvc db-data -p '\''{"spec":{"resources":{"requests":{"storage":"1Gi"}}}}'\'' --dry-run=server 2>&1)"; r=$?; [ $r -ne 0 ] && printf %s "$o" | grep -Eiq '\''less than'\''; }'
echo 'Constraint: Keep the same claim (do not delete and recreate it) and keep the pod running.'
chk 'Keep the same claim (do not delete and recreate it) and keep the pod running.' '[ "$(kubectl get pvc/db-data -n data -o jsonpath='\''{.metadata.annotations.kubedrill/original}'\'' 2>/dev/null)" = '\''yes'\'' ] && [ "$(kubectl get pvc/db-data -n data -o jsonpath='\''{.status.phase}'\'' 2>/dev/null)" = '\''Bound'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
