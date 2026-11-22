#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: render workers will not run (leave the sick node alone) (s137-incident-render)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Symptom 1: render pods are scheduled somewhere'
chk 'Symptom 1: render pods are scheduled somewhere' '[ "$(kubectl get pods -n inc-render -l app=render --no-headers 2>/dev/null | wc -l)" -ge 1 ] && [ "$(kubectl get node worker1 -o jsonpath='\''{.spec.unschedulable}'\'' 2>/dev/null)" != "true" ]'
echo 'Task 2: Symptom 2: a node actually satisfies `disk=ssd`'
chk 'Symptom 2: a node actually satisfies `disk=ssd`' '[ "$(kubectl get node/worker1 -o jsonpath='\''{.metadata.labels.disk}'\'' 2>/dev/null)" = '\''ssd'\'' ]'
echo 'Task 3: Symptom 3: all 3 pods are Ready (the namespace quota allows them)'
chk 'Symptom 3: all 3 pods are Ready (the namespace quota allows them)' '[ "$(kubectl get pods -n inc-render -l app=render -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ] && ! kubectl get events -n inc-render 2>/dev/null | grep -qi "exceeded quota"'
echo 'Constraint: Leave `worker2` cordoned and keep the `disk=ssd` nodeSelector.'
chk 'Leave `worker2` cordoned and keep the `disk=ssd` nodeSelector.' '[ "$(kubectl get node worker2 -o jsonpath='\''{.spec.unschedulable}'\'' 2>/dev/null)" = "true" ] && [ "$(kubectl get deployment/render -n inc-render -o jsonpath='\''{.spec.template.spec.nodeSelector.disk}'\'' 2>/dev/null)" = '\''ssd'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
