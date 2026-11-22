#!/usr/bin/env bash
# KubeDrill lab pack: Change config without a restart: volume vs env (s121-config-reload)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Mount ConfigMap `flags` at `/etc/flags` and drop the env var'
chk 'Mount ConfigMap `flags` at `/etc/flags` and drop the env var' '[ "$(kubectl get deploy/web -n reload -o jsonpath='\''{.spec.template.spec.volumes[0].configMap.name}'\'' 2>/dev/null)" = '\''flags'\'' ] && [ "$(kubectl get deploy/web -n reload -o jsonpath='\''{.spec.template.spec.containers[0].volumeMounts[0].mountPath}'\'' 2>/dev/null)" = '\''/etc/flags'\'' ] && [ "$(kubectl get deploy/web -n reload -o jsonpath='\''{.spec.template.spec.containers[0].env}'\'' 2>/dev/null)" = '\'''\'' ]'
echo 'Task 2: Both pods are Ready on the new template'
chk 'Both pods are Ready on the new template' '[ "$(kubectl get pods -n reload -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Task 3: Flip `FEATURE` to `on` and see it in the running pods'
chk 'Flip `FEATURE` to `on` and see it in the running pods' '[ "$(kubectl get configmap/flags -n reload -o jsonpath='\''{.data.FEATURE}'\'' 2>/dev/null)" = '\''on'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
