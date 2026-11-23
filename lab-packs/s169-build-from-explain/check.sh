#!/usr/bin/env bash
# KubeDrill lab pack: Documentation lookup: build the object from explain, not from memory (s169-build-from-explain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: The pod template has the constraint with the three right values'
chk 'The pod template has the constraint with the three right values' '[ "$(kubectl get deployment/web -n spread -o jsonpath='\''{.spec.template.spec.topologySpreadConstraints[0].maxSkew}'\'' 2>/dev/null)" = '\''1'\'' ] && [ "$(kubectl get deployment/web -n spread -o jsonpath='\''{.spec.template.spec.topologySpreadConstraints[0].topologyKey}'\'' 2>/dev/null)" = '\''kubernetes.io/hostname'\'' ] && [ "$(kubectl get deployment/web -n spread -o jsonpath='\''{.spec.template.spec.topologySpreadConstraints[0].whenUnsatisfiable}'\'' 2>/dev/null)" = '\''DoNotSchedule'\'' ]'
echo 'Task 2: It selects its own pods and the rollout is Ready'
chk 'It selects its own pods and the rollout is Ready' '[ "$(kubectl get deployment/web -n spread -o jsonpath='\''{.spec.template.spec.topologySpreadConstraints[0].labelSelector.matchLabels.app}'\'' 2>/dev/null)" = '\''web'\'' ] && [ "$(kubectl get pods -n spread -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo 'Constraint: Keep 3 replicas and the image.'
chk 'Keep 3 replicas and the image.' '[ "$(kubectl get deployment/web -n spread -o jsonpath='\''{.spec.replicas}'\'' 2>/dev/null)" = '\''3'\'' ] && [ "$(kubectl get deployment/web -n spread -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.25'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
