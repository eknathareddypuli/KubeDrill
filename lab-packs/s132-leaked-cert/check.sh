#!/usr/bin/env bash
# KubeDrill lab pack: A developer laptop was stolen: remove what the certificate can do (s132-leaked-cert)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Bob has no access in `sales`'
chk 'Bob has no access in `sales`' '[ "$(kubectl auth can-i list pods --as=bob --as-group=contractors -n sales 2>/dev/null)" = no ]'
echo 'Task 2: Bob has no cluster-wide access'
chk 'Bob has no cluster-wide access' '[ "$(kubectl auth can-i list pods --as=bob --as-group=contractors -A 2>/dev/null)" = no ]'
echo 'Task 3: Bob has no access in `finance` (his GROUP grants it)'
chk 'Bob has no access in `finance` (his GROUP grants it)' '[ "$(kubectl auth can-i list pods --as=bob --as-group=contractors -n finance 2>/dev/null)" = no ]'
echo 'Constraint: Do not break Alice (sales) or Carol (finance).'
chk 'Do not break Alice (sales) or Carol (finance).' '[ "$(kubectl auth can-i list pods --as=alice -n sales 2>/dev/null)" = yes ] && [ "$(kubectl auth can-i list pods --as=carol --as-group=contractors -n finance 2>/dev/null)" = yes ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
