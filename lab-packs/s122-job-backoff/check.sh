#!/usr/bin/env bash
# KubeDrill lab pack: A failing Job: stop the retries, fix, and tidy up (s122-job-backoff)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Recreate `export` so the Job completes'
chk 'Recreate `export` so the Job completes' '[ "$(kubectl get job/export -n batchq -o jsonpath='\''{.status.succeeded}'\'' 2>/dev/null)" = '\''1'\'' ]'
echo 'Task 2: Give up after one retry and within 120 seconds'
chk 'Give up after one retry and within 120 seconds' '[ "$(kubectl get job/export -n batchq -o jsonpath='\''{.spec.backoffLimit}'\'' 2>/dev/null)" = '\''1'\'' ] && [ "$(kubectl get job/export -n batchq -o jsonpath='\''{.spec.activeDeadlineSeconds}'\'' 2>/dev/null)" = '\''120'\'' ]'
echo 'Task 3: Clean up automatically after 10 minutes'
chk 'Clean up automatically after 10 minutes' '[ "$(kubectl get job/export -n batchq -o jsonpath='\''{.spec.ttlSecondsAfterFinished}'\'' 2>/dev/null)" = '\''600'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
