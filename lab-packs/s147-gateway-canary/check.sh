#!/usr/bin/env bash
# KubeDrill lab pack: Gateway API: header routing and a 90/10 split (s147-gateway-canary)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Requests with header `x-canary: true` go to `shop-v2`'
chk 'Requests with header `x-canary: true` go to `shop-v2`' '[ "$(kubectl get httproute/shop -n gw3 -o jsonpath='\''{.spec.rules[0].matches[0].headers[0].name}'\'' 2>/dev/null)" = '\''x-canary'\'' ] && [ "$(kubectl get httproute/shop -n gw3 -o jsonpath='\''{.spec.rules[0].backendRefs[0].name}'\'' 2>/dev/null)" = '\''shop-v2'\'' ]'
echo 'Task 2: All other traffic is split 90 to `shop-v1`, 10 to `shop-v2`'
chk 'All other traffic is split 90 to `shop-v1`, 10 to `shop-v2`' '[ "$(kubectl get httproute/shop -n gw3 -o jsonpath='\''{.spec.rules[1].backendRefs[0].weight}'\'' 2>/dev/null)" = '\''90'\'' ] && [ "$(kubectl get httproute/shop -n gw3 -o jsonpath='\''{.spec.rules[1].backendRefs[1].name}'\'' 2>/dev/null)" = '\''shop-v2'\'' ] && [ "$(kubectl get httproute/shop -n gw3 -o jsonpath='\''{.spec.rules[1].backendRefs[1].weight}'\'' 2>/dev/null)" = '\''10'\'' ]'
echo 'Constraint: Keep the route attached to Gateway `public` and do not edit the Gateway.'
chk 'Keep the route attached to Gateway `public` and do not edit the Gateway.' '[ "$(kubectl get httproute/shop -n gw3 -o jsonpath='\''{.spec.parentRefs[0].name}'\'' 2>/dev/null)" = '\''public'\'' ] && [ "$(kubectl get gateway/public -n gw3 -o jsonpath='\''{.spec.listeners[0].port}'\'' 2>/dev/null)" = '\''80'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
