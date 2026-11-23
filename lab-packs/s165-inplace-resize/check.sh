#!/usr/bin/env bash
# KubeDrill lab pack: Resize a running pod without restarting it (s165-inplace-resize)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: The container has 400m CPU requests and limits'
chk 'The container has 400m CPU requests and limits' '[ "$(kubectl get pod/worker -n resize -o jsonpath='\''{.spec.containers[0].resources.limits.cpu}'\'' 2>/dev/null)" = '\''400m'\'' ] && [ "$(kubectl get pod/worker -n resize -o jsonpath='\''{.spec.containers[0].resources.requests.cpu}'\'' 2>/dev/null)" = '\''400m'\'' ]'
echo 'Task 2: The running container actually has the new size'
chk 'The running container actually has the new size' '[ "$(kubectl get pod/worker -n resize -o jsonpath='\''{.status.containerStatuses[0].resources.limits.cpu}'\'' 2>/dev/null)" = '\''400m'\'' ] && [ "$(kubectl get pods -n resize -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo 'Constraint: The same pod must survive: keep its annotation and zero restarts.'
chk 'The same pod must survive: keep its annotation and zero restarts.' '[ "$(kubectl get pod/worker -n resize -o jsonpath='\''{.metadata.annotations.kubedrill/original}'\'' 2>/dev/null)" = '\''yes'\'' ] && [ "$(kubectl get pod/worker -n resize -o jsonpath='\''{.status.containerStatuses[0].restartCount}'\'' 2>/dev/null)" = '\''0'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
