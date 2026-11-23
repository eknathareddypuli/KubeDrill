#!/usr/bin/env bash
# KubeDrill lab pack: NetworkPolicy: ipBlock and a port range (s164-netpol-iprange)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: `tester` reaches ports 8080 and 8081'
chk '`tester` reaches ports 8080 and 8081' 'kubectl exec -n ranges tester -- wget -qO- -T 3 api-8080:8080 >/dev/null 2>&1 && kubectl exec -n ranges tester -- wget -qO- -T 3 api-8081:8081 >/dev/null 2>&1'
echo 'Task 2: Port 8090 stays blocked'
chk 'Port 8090 stays blocked' '! kubectl exec -n ranges tester -- wget -qO- -T 3 api-8090:8090 >/dev/null 2>&1'
echo 'Constraint: Keep the `default-deny` policy.'
chk 'Keep the `default-deny` policy.' 'kubectl get networkpolicy/default-deny -n ranges >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
