#!/usr/bin/env bash
# KubeDrill lab pack: Quota and LimitRange: who spent the CPU? (s119-quota-limitrange)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Lower the LimitRange default request to `100m`'
chk 'Lower the LimitRange default request to `100m`' '[ "$(kubectl get limitrange/defaults -n team-b -o jsonpath='\''{.spec.limits[0].defaultRequest.cpu}'\'' 2>/dev/null)" = '\''100m'\'' ]'
echo 'Task 2: All 4 `web` replicas are Ready without quota errors'
chk 'All 4 `web` replicas are Ready without quota errors' '[ "$(kubectl get pods -n team-b -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 4 ] && ! kubectl get events -n team-b 2>/dev/null | grep -qi "exceeded quota"'
echo 'Constraint: Do not raise or remove the quota (`requests.cpu` stays 1).'
chk 'Do not raise or remove the quota (`requests.cpu` stays 1).' '[ "$(kubectl get resourcequota/cpu-cap -n team-b -o jsonpath='\''{.spec.hard.requests\.cpu}'\'' 2>/dev/null)" = '\''1'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
