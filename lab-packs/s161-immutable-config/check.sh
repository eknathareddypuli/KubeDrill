#!/usr/bin/env bash
# KubeDrill lab pack: Change the setting in an immutable ConfigMap (s161-immutable-config)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: A new immutable ConfigMap carries `LOG_LEVEL=debug`'
chk 'A new immutable ConfigMap carries `LOG_LEVEL=debug`' '[ "$(kubectl get cm/web-config-v2 -n conf -o jsonpath='\''{.data.LOG_LEVEL}'\'' 2>/dev/null)" = '\''debug'\'' ] && [ "$(kubectl get cm/web-config-v2 -n conf -o jsonpath='\''{.immutable}'\'' 2>/dev/null)" = '\''true'\'' ]'
echo 'Task 2: The Deployment uses it and all pods are Ready'
chk 'The Deployment uses it and all pods are Ready' '[ "$(kubectl get deployment/web -n conf -o jsonpath='\''{.spec.template.spec.containers[0].envFrom[0].configMapRef.name}'\'' 2>/dev/null)" = '\''web-config-v2'\'' ] && [ "$(kubectl get pods -n conf -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Constraint: Leave `web-config-v1` exactly as it is.'
chk 'Leave `web-config-v1` exactly as it is.' '[ "$(kubectl get cm/web-config-v1 -n conf -o jsonpath='\''{.data.LOG_LEVEL}'\'' 2>/dev/null)" = '\''info'\'' ] && [ "$(kubectl get cm/web-config-v1 -n conf -o jsonpath='\''{.immutable}'\'' 2>/dev/null)" = '\''true'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
