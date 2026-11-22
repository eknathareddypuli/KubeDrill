#!/usr/bin/env bash
# KubeDrill lab pack: Gateway API: cross-namespace backend needs a ReferenceGrant (s148-gateway-referencegrant)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: The route names the namespace of its backend'
chk 'The route names the namespace of its backend' '[ "$(kubectl get httproute/api -n web -o jsonpath='\''{.spec.rules[0].backendRefs[0].namespace}'\'' 2>/dev/null)" = '\''data'\'' ]'
echo 'Task 2: `data` has a ReferenceGrant named `allow-web-routes`: HTTPRoutes from `web` to Service `api` only'
chk '`data` has a ReferenceGrant named `allow-web-routes`: HTTPRoutes from `web` to Service `api` only' 'kubectl get referencegrant/allow-web-routes -n data >/dev/null 2>&1 && [ "$(kubectl get referencegrant/allow-web-routes -n data -o jsonpath='\''{.spec.from[0].namespace}'\'' 2>/dev/null)" = '\''web'\'' ] && [ "$(kubectl get referencegrant/allow-web-routes -n data -o jsonpath='\''{.spec.from[0].kind}'\'' 2>/dev/null)" = '\''HTTPRoute'\'' ] && [ "$(kubectl get referencegrant/allow-web-routes -n data -o jsonpath='\''{.spec.to[0].name}'\'' 2>/dev/null)" = '\''api'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
