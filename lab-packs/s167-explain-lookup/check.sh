#!/usr/bin/env bash
# KubeDrill lab pack: Documentation lookup: find the field in kubectl explain (s167-explain-lookup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Questions 1 and 2 are answered'
chk 'Questions 1 and 2 are answered' '[ -f "$HOME/answers.txt" ] && grep -Eq -- '\''^q1=maxSurge$'\'' "$HOME/answers.txt" && [ -f "$HOME/answers.txt" ] && grep -Eq -- '\''^q2=Allow,Forbid,Replace$'\'' "$HOME/answers.txt"'
echo 'Task 2: Questions 3 and 4 are answered'
chk 'Questions 3 and 4 are answered' '[ -f "$HOME/answers.txt" ] && grep -Eq -- '\''^q3=integer$'\'' "$HOME/answers.txt" && [ -f "$HOME/answers.txt" ] && grep -Eq -- '\''^q4=Local$'\'' "$HOME/answers.txt"'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
