#!/usr/bin/env bash
# KubeDrill lab pack: DNS is up but Service names do not resolve: the Corefile (s117-corefile)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find the typo in the `kubernetes` plugin line of the Corefile'
chk 'Find the typo in the `kubernetes` plugin line of the Corefile' 'echo "$(kubectl get configmap/coredns -n kube-system -o jsonpath='\''{.data.Corefile}'\'' 2>/dev/null)" | grep -Eq -- '\''kubernetes cluster\.local'\'''
echo 'Task 2: `tester` resolves and reaches `backend-svc` by short name'
chk '`tester` resolves and reaches `backend-svc` by short name' 'kubectl exec -n dns-lab tester -- wget -qO- -T 3 backend-svc:80 >/dev/null 2>&1'
echo 'Task 3: It also works with the fully qualified name'
chk 'It also works with the fully qualified name' 'kubectl exec -n dns-lab tester -- wget -qO- -T 3 backend-svc.dns-lab.svc.cluster.local:80 >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
