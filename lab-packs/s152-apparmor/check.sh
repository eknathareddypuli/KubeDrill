#!/usr/bin/env bash
# KubeDrill lab pack: AppArmor: write a profile and attach it with the current field (s152-apparmor)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: The container uses `appArmorProfile` type `Localhost` with profile `k8s-deny-write`'
chk 'The container uses `appArmorProfile` type `Localhost` with profile `k8s-deny-write`' '[ "$(kubectl get deploy/web -n cks-aa -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.appArmorProfile.type}'\'' 2>/dev/null)" = '\''Localhost'\'' ] && [ "$(kubectl get deploy/web -n cks-aa -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.appArmorProfile.localhostProfile}'\'' 2>/dev/null)" = '\''k8s-deny-write'\'' ]'
echo 'Task 2: The profile file is named `k8s-deny-write` and denies writes'
chk 'The profile file is named `k8s-deny-write` and denies writes' '[ -f "$HOME/k8s-deny-write" ] && grep -Eq -- '\''profile\s+k8s-deny-write\b'\'' "$HOME/k8s-deny-write" && [ -f "$HOME/k8s-deny-write" ] && grep -Eq -- '\''^\s*deny\s+/\*\*\s+w,'\'' "$HOME/k8s-deny-write"'
echo 'Constraint: Keep image `nginx:1.25` and 1 replica.'
chk 'Keep image `nginx:1.25` and 1 replica.' '[ "$(kubectl get deploy/web -n cks-aa -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.25'\'' ] && [ "$(kubectl get deploy/web -n cks-aa -o jsonpath='\''{.spec.replicas}'\'' 2>/dev/null)" = '\''1'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
