#!/usr/bin/env bash
# KubeDrill lab pack: Version skew: which components are out of policy? (s155-version-skew)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: The three violators are listed'
chk 'The three violators are listed' '[ -f "$HOME/violations.txt" ] && grep -Eq -- '\''^kube-scheduler$'\'' "$HOME/violations.txt" && [ -f "$HOME/violations.txt" ] && grep -Eq -- '\''^kubelet-worker3$'\'' "$HOME/violations.txt" && [ -f "$HOME/violations.txt" ] && grep -Eq -- '\''^kubelet-worker4$'\'' "$HOME/violations.txt"'
echo 'Task 2: Compliant components are not listed'
chk 'Compliant components are not listed' '[ -f "$HOME/violations.txt" ] && ! grep -Eq -- '\''kube-apiserver|kube-controller-manager|kubelet-worker1|kubelet-worker2|kubectl-admin'\'' "$HOME/violations.txt"'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
