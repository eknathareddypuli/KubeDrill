#!/usr/bin/env bash
# KubeDrill lab pack: Pending CSRs: approve one, deny the dangerous one (s131-review-csrs)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find out what `build-bot` asked for and write the group to `finding.txt`'
chk 'Find out what `build-bot` asked for and write the group to `finding.txt`' '[ -f "$HOME/finding.txt" ] && grep -Eq -- '\''system:masters'\'' "$HOME/finding.txt"'
echo 'Task 2: Approve `dev-ci`'
chk 'Approve `dev-ci`' '[ "$(kubectl get csr/dev-ci -o jsonpath='\''{.status.conditions[0].type}'\'' 2>/dev/null)" = '\''Approved'\'' ] && echo "$(kubectl get csr/dev-ci -o jsonpath='\''{.status.certificate}'\'' 2>/dev/null)" | grep -Eq -- '\''.+'\'''
echo 'Task 3: Deny `build-bot`'
chk 'Deny `build-bot`' '[ "$(kubectl get csr/build-bot -o jsonpath='\''{.status.conditions[0].type}'\'' 2>/dev/null)" = '\''Denied'\'' ]'
echo 'Constraint: Leave `old-laptop` pending: no decision without its owner.'
chk 'Leave `old-laptop` pending: no decision without its owner.' '[ "$(kubectl get csr/old-laptop -o jsonpath='\''{.status.conditions[0].type}'\'' 2>/dev/null)" = '\'''\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
