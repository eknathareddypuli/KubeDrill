#!/usr/bin/env bash
# KubeDrill lab pack: Zero-downtime rollout: surge, readiness, preStop, PDB (s129-zero-downtime)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Never remove capacity during a rollout'
chk 'Never remove capacity during a rollout' '[ "$(kubectl get deploy/checkout -n checkout-z -o jsonpath='\''{.spec.strategy.rollingUpdate.maxUnavailable}'\'' 2>/dev/null)" = '\''0'\'' ] && [ "$(kubectl get deploy/checkout -n checkout-z -o jsonpath='\''{.spec.strategy.rollingUpdate.maxSurge}'\'' 2>/dev/null)" = '\''1'\'' ]'
echo 'Task 2: Only count a pod as ready when it answers'
chk 'Only count a pod as ready when it answers' '[ -n "$(kubectl get deploy/checkout -n checkout-z -o jsonpath='\''{.spec.template.spec.containers[0].readinessProbe.httpGet.path}'\'' 2>/dev/null)" ]'
echo 'Task 3: Drain gracefully: `preStop` sleep 10 and a 45 s grace period'
chk 'Drain gracefully: `preStop` sleep 10 and a 45 s grace period' '[ "$(kubectl get deploy/checkout -n checkout-z -o jsonpath='\''{.spec.template.spec.containers[0].lifecycle.preStop.exec.command[0]}'\'' 2>/dev/null)" = '\''sleep'\'' ] && [ "$(kubectl get deploy/checkout -n checkout-z -o jsonpath='\''{.spec.template.spec.terminationGracePeriodSeconds}'\'' 2>/dev/null)" = '\''45'\'' ]'
echo 'Task 4: Protect against voluntary disruptions with a PodDisruptionBudget'
chk 'Protect against voluntary disruptions with a PodDisruptionBudget' '[ "$(kubectl get pdb/checkout -n checkout-z -o jsonpath='\''{.spec.minAvailable}'\'' 2>/dev/null)" = '\''2'\'' ]'
echo 'Task 5: The rollout completes with 3 Ready pods'
chk 'The rollout completes with 3 Ready pods' '[ "$(kubectl get pods -n checkout-z -l app=checkout -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
