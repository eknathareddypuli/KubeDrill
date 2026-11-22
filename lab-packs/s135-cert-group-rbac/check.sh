#!/usr/bin/env bash
# KubeDrill lab pack: Auditors cannot read pods: bind the group the certificate carries (s135-cert-group-rbac)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find out who the bot is and write its GROUP to `bot-group.txt`'
chk 'Find out who the bot is and write its GROUP to `bot-group.txt`' '[ -f "$HOME/bot-group.txt" ] && grep -Eq -- '\''auditors'\'' "$HOME/bot-group.txt"'
echo 'Task 2: The auditors can list pods cluster-wide'
chk 'The auditors can list pods cluster-wide' '[ "$(kubectl auth can-i list pods --as=audit-bot --as-group=auditors -A 2>/dev/null)" = yes ] && [ "$(kubectl get clusterrolebinding/auditors-view -o jsonpath='\''{.subjects[0].kind}'\'' 2>/dev/null)" = '\''Group'\'' ]'
echo 'Constraint: Least privilege: no Secrets, no deletes.'
chk 'Least privilege: no Secrets, no deletes.' '[ "$(kubectl auth can-i get secrets --as=audit-bot --as-group=auditors -A 2>/dev/null)" = no ] && [ "$(kubectl auth can-i delete pods --as=audit-bot --as-group=auditors -A 2>/dev/null)" = no ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
