#!/usr/bin/env bash
# KubeDrill lab pack: Documentation lookup: what is required, and what is allowed (s168-explain-required)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: `a` and `b` are right'
chk '`a` and `b` are right' '[ -f "$HOME/lookup.txt" ] && grep -Eq -- '\''^a=maxSkew,topologyKey,whenUnsatisfiable$'\'' "$HOME/lookup.txt" && [ -f "$HOME/lookup.txt" ] && grep -Eq -- '\''^b=DoNotSchedule,ScheduleAnyway$'\'' "$HOME/lookup.txt"'
echo 'Task 2: `c` and `d` are right'
chk '`c` and `d` are right' '[ -f "$HOME/lookup.txt" ] && grep -Eq -- '\''^c=Fail,Ignore$'\'' "$HOME/lookup.txt" && [ -f "$HOME/lookup.txt" ] && grep -Eq -- '\''^d=allowVolumeExpansion$'\'' "$HOME/lookup.txt"'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
