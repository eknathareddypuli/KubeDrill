#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: selector that matches nothing (s146-yaml-selector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Deployment `site` has 2 Ready pods'
chk 'Deployment `site` has 2 Ready pods' '[ "$(kubectl get pods -n yr-sel -l app=site -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Constraint: Keep the pod label `app: site`.'
chk 'Keep the pod label `app: site`.' '[ -f "$HOME/site.yaml" ] && grep -Eq -- '\''app: site'\'' "$HOME/site.yaml"'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
