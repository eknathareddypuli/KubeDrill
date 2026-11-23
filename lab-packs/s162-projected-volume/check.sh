#!/usr/bin/env bash
# KubeDrill lab pack: One directory from a ConfigMap, a Secret and the Downward API (s162-projected-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: A projected volume `agent-etc` combines the three sources'
chk 'A projected volume `agent-etc` combines the three sources' '[ "$(kubectl get deployment/agent -n proj -o jsonpath='\''{.spec.template.spec.volumes[0].name}'\'' 2>/dev/null)" = '\''agent-etc'\'' ] && echo "$(kubectl get deployment/agent -n proj -o jsonpath='\''{.spec.template.spec.volumes[0].projected.sources[*].configMap.name}'\'' 2>/dev/null)" | grep -Eq -- '\''agent-config'\'' && echo "$(kubectl get deployment/agent -n proj -o jsonpath='\''{.spec.template.spec.volumes[0].projected.sources[*].secret.name}'\'' 2>/dev/null)" | grep -Eq -- '\''agent-token'\'' && echo "$(kubectl get deployment/agent -n proj -o jsonpath='\''{.spec.template.spec.volumes[0].projected.sources[*].downwardAPI.items[*].fieldRef.fieldPath}'\'' 2>/dev/null)" | grep -Eq -- '\''metadata\.labels'\'''
echo 'Task 2: The container mounts `agent-etc` at `/etc/agent` and the pod is Ready'
chk 'The container mounts `agent-etc` at `/etc/agent` and the pod is Ready' '[ "$(kubectl get deployment/agent -n proj -o jsonpath='\''{.spec.template.spec.containers[0].volumeMounts[0].name}'\'' 2>/dev/null)" = '\''agent-etc'\'' ] && [ "$(kubectl get pods -n proj -l app=agent -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo 'Constraint: Keep the ConfigMap and the Secret as they are, and mount at `/etc/agent`.'
chk 'Keep the ConfigMap and the Secret as they are, and mount at `/etc/agent`.' '[ "$(kubectl get cm/agent-config -n proj -o jsonpath='\''{.data.agent\.conf}'\'' 2>/dev/null)" = '\''interval=30'\'' ] && [ "$(kubectl get deployment/agent -n proj -o jsonpath='\''{.spec.template.spec.containers[0].volumeMounts[0].mountPath}'\'' 2>/dev/null)" = '\''/etc/agent'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
