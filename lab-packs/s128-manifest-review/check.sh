#!/usr/bin/env bash
# KubeDrill lab pack: Review a manifest: fix six production anti-patterns (s128-manifest-review)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Pin the image to an explicit version'
chk 'Pin the image to an explicit version' 'echo "$(kubectl get deploy/orders-web -n review -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" | grep -Eq -- '\'':[0-9]'\'''
echo 'Task 2: Set CPU/memory requests and a memory limit'
chk 'Set CPU/memory requests and a memory limit' '[ -n "$(kubectl get deploy/orders-web -n review -o jsonpath='\''{.spec.template.spec.containers[0].resources.requests.cpu}'\'' 2>/dev/null)" ] && [ -n "$(kubectl get deploy/orders-web -n review -o jsonpath='\''{.spec.template.spec.containers[0].resources.limits.memory}'\'' 2>/dev/null)" ]'
echo 'Task 3: Add an HTTP readiness probe'
chk 'Add an HTTP readiness probe' '[ -n "$(kubectl get deploy/orders-web -n review -o jsonpath='\''{.spec.template.spec.containers[0].readinessProbe.httpGet.path}'\'' 2>/dev/null)" ]'
echo 'Task 4: Run as non-root without privilege escalation'
chk 'Run as non-root without privilege escalation' '[ "$(kubectl get deploy/orders-web -n review -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.runAsNonRoot}'\'' 2>/dev/null)" = '\''true'\'' ] && [ "$(kubectl get deploy/orders-web -n review -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation}'\'' 2>/dev/null)" = '\''false'\'' ]'
echo 'Task 5: Read the password from Secret `orders-db`'
chk 'Read the password from Secret `orders-db`' '[ "$(kubectl get deploy/orders-web -n review -o jsonpath='\''{.spec.template.spec.containers[0].env[0].valueFrom.secretKeyRef.name}'\'' 2>/dev/null)" = '\''orders-db'\'' ] && [ "$(kubectl get deploy/orders-web -n review -o jsonpath='\''{.spec.template.spec.containers[0].env[0].value}'\'' 2>/dev/null)" = '\'''\'' ]'
echo 'Task 6: Run 2 replicas, all Ready'
chk 'Run 2 replicas, all Ready' '[ "$(kubectl get pods -n review -l app=orders-web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
