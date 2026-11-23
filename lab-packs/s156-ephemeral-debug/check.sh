#!/usr/bin/env bash
# KubeDrill lab pack: Debug a shell-less pod with an ephemeral container (s156-ephemeral-debug)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Ephemeral container `inspector` exists on `api`'
chk 'Ephemeral container `inspector` exists on `api`' '[ "$(kubectl get pod/api -n dbg -o jsonpath='\''{.spec.ephemeralContainers[0].name}'\'' 2>/dev/null)" = '\''inspector'\'' ] && [ "$(kubectl get pod/api -n dbg -o jsonpath='\''{.spec.ephemeralContainers[0].targetContainerName}'\'' 2>/dev/null)" = '\''api'\'' ] && [ "$(kubectl get pod/api -n dbg -o jsonpath='\''{.spec.ephemeralContainers[0].image}'\'' 2>/dev/null)" = '\''busybox:1.36'\'' ]'
echo 'Task 2: The original pod is still Running and was not restarted'
chk 'The original pod is still Running and was not restarted' '[ "$(kubectl get pods -n dbg -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ] && [ "$(kubectl get pod/api -n dbg -o jsonpath='\''{.status.containerStatuses[0].restartCount}'\'' 2>/dev/null)" = '\''0'\'' ]'
echo 'Constraint: Do not recreate or change `api`: it must keep its image and the `kubedrill/original` annotation.'
chk 'Do not recreate or change `api`: it must keep its image and the `kubedrill/original` annotation.' '[ "$(kubectl get pod/api -n dbg -o jsonpath='\''{.metadata.annotations.kubedrill/original}'\'' 2>/dev/null)" = '\''yes'\'' ] && [ "$(kubectl get pod/api -n dbg -o jsonpath='\''{.spec.containers[0].image}'\'' 2>/dev/null)" = '\''registry.k8s.io/pause:3.9'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
