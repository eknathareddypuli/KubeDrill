#!/usr/bin/env bash
# KubeDrill lab pack: Make the log shipper a native sidecar (s163-native-sidecar)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: `shipper` is an init container with `restartPolicy: Always`'
chk '`shipper` is an init container with `restartPolicy: Always`' '[ "$(kubectl get deployment/shop -n side -o jsonpath='\''{.spec.template.spec.initContainers[0].name}'\'' 2>/dev/null)" = '\''shipper'\'' ] && [ "$(kubectl get deployment/shop -n side -o jsonpath='\''{.spec.template.spec.initContainers[0].restartPolicy}'\'' 2>/dev/null)" = '\''Always'\'' ]'
echo 'Task 2: Only `app` is left in `containers` and both pods are Ready'
chk 'Only `app` is left in `containers` and both pods are Ready' '[ "$(kubectl get pods -n side -l app=shop --no-headers 2>/dev/null | wc -l)" -ge 2 ] && [ "$(kubectl get deployment/shop -n side -o jsonpath='\''{.spec.template.spec.containers[*].name}'\'' 2>/dev/null)" = '\''app'\'' ] && [ "$(kubectl get pods -n side -l app=shop -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Constraint: Keep the `app` container, and keep the shipper image and command.'
chk 'Keep the `app` container, and keep the shipper image and command.' '[ "$(kubectl get deployment/shop -n side -o jsonpath='\''{.spec.template.spec.containers[0].name}'\'' 2>/dev/null)" = '\''app'\'' ] && echo "$(kubectl get deployment/shop -n side -o jsonpath='\''{.spec.template.spec.initContainers[0].command[*]}'\'' 2>/dev/null)" | grep -Eq -- '\''sleep 3600'\'''
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
