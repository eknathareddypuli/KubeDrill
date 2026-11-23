#!/usr/bin/env bash
# KubeDrill lab pack: An admission policy that does nothing: add the binding (s158-vap-binding)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: A `latest` image is rejected in `shop-prod`'
chk 'A `latest` image is rejected in `shop-prod`' '{ o="$(kubectl -n shop-prod create deployment probe-bad --image=nginx:latest --dry-run=server 2>&1)"; r=$?; [ $r -ne 0 ] && printf %s "$o" | grep -Eiq '\''denied request'\''; }'
echo 'Task 2: A pinned image is still accepted in `shop-prod`'
chk 'A pinned image is still accepted in `shop-prod`' 'kubectl -n shop-prod create deployment probe-ok --image=nginx:1.25 --dry-run=server >/dev/null 2>&1'
echo 'Task 3: `shop-dev` is not affected'
chk '`shop-dev` is not affected' 'kubectl -n shop-dev create deployment probe-dev --image=nginx:latest --dry-run=server >/dev/null 2>&1'
echo 'Constraint: Leave the `no-latest` policy as it is.'
chk 'Leave the `no-latest` policy as it is.' 'echo "$(kubectl get validatingadmissionpolicy/no-latest -o jsonpath='\''{.spec.validations[0].expression}'\'' 2>/dev/null)" | grep -Eq -- '\''latest'\'' && [ "$(kubectl get validatingadmissionpolicy/no-latest -o jsonpath='\''{.spec.failurePolicy}'\'' 2>/dev/null)" = '\''Fail'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
