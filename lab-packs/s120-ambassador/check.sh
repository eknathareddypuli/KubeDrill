#!/usr/bin/env bash
# KubeDrill lab pack: Ambassador pattern: talk to localhost, let a proxy do the rest (s120-ambassador)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Add a second container named `ambassador` (image `nginx:1.25`)'
chk 'Add a second container named `ambassador` (image `nginx:1.25`)' '[ "$(kubectl get deploy/api -n ambassador -o jsonpath='\''{.spec.template.spec.containers[1].name}'\'' 2>/dev/null)" = '\''ambassador'\'' ]'
echo 'Task 2: The ambassador knows the upstream: env `UPSTREAM=db-prod:5432`, port 5432'
chk 'The ambassador knows the upstream: env `UPSTREAM=db-prod:5432`, port 5432' '[ "$(kubectl get deploy/api -n ambassador -o jsonpath='\''{.spec.template.spec.containers[1].env[0].value}'\'' 2>/dev/null)" = '\''db-prod:5432'\'' ] && [ "$(kubectl get deploy/api -n ambassador -o jsonpath='\''{.spec.template.spec.containers[1].ports[0].containerPort}'\'' 2>/dev/null)" = '\''5432'\'' ]'
echo 'Task 3: The app connects to `localhost` and both containers are Ready'
chk 'The app connects to `localhost` and both containers are Ready' '[ "$(kubectl get deploy/api -n ambassador -o jsonpath='\''{.spec.template.spec.containers[0].env[0].value}'\'' 2>/dev/null)" = '\''localhost'\'' ] && [ "$(kubectl get pods -n ambassador -l app=api -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
