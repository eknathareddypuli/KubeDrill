#!/usr/bin/env bash
# KubeDrill lab pack: Read a Trivy report: what must be fixed first (s154-trivy-report)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: critical-images.txt lists the images with a CRITICAL finding'
chk 'critical-images.txt lists the images with a CRITICAL finding' '[ -f "$HOME/critical-images.txt" ] && grep -Eq -- '\''^app:v2$'\'' "$HOME/critical-images.txt" && [ -f "$HOME/critical-images.txt" ] && grep -Eq -- '\''^nginx:1\.19$'\'' "$HOME/critical-images.txt" && [ -f "$HOME/critical-images.txt" ] && grep -Eq -- '\''^redis:6\.0$'\'' "$HOME/critical-images.txt" && [ -f "$HOME/critical-images.txt" ] && ! grep -Eq -- '\''^alpine'\'' "$HOME/critical-images.txt"'
echo 'Task 2: fixable.txt holds how many findings have a fix available'
chk 'fixable.txt holds how many findings have a fix available' '[ -f "$HOME/fixable.txt" ] && grep -Eq -- '\''^\s*6\s*$'\'' "$HOME/fixable.txt"'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
