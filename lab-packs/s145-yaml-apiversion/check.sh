#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: removed apiVersion (s145-yaml-apiversion)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Manifest uses `apps/v1` and Deployment `legacy` is Ready'
chk 'Manifest uses `apps/v1` and Deployment `legacy` is Ready' '[ -f "$HOME/legacy.yaml" ] && grep -q -F -- '\''apiVersion: apps/v1
'\'' "$HOME/legacy.yaml" && [ "$(kubectl get pods -n yr-api -l app=legacy -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
