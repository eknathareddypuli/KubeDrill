#!/usr/bin/env bash
# KubeDrill lab pack: CRD: the custom resource is rejected by its schema (s149-crd-schema)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Backup `nightly` exists with `schedule: 0 2 * * *`'
chk 'Backup `nightly` exists with `schedule: 0 2 * * *`' '[ "$(kubectl get backup/nightly -n ops -o jsonpath='\''{.spec.schedule}'\'' 2>/dev/null)" = '\''0 2 * * *'\'' ]'
echo 'Task 2: It keeps 7 copies on the `pro` tier'
chk 'It keeps 7 copies on the `pro` tier' '[ "$(kubectl get backup/nightly -n ops -o jsonpath='\''{.spec.keep}'\'' 2>/dev/null)" = '\''7'\'' ] && [ "$(kubectl get backup/nightly -n ops -o jsonpath='\''{.spec.tier}'\'' 2>/dev/null)" = '\''pro'\'' ]'
echo 'Constraint: Do not change the CRD schema.'
chk 'Do not change the CRD schema.' '[ "$(kubectl get crd/backups.stable.example.com -o jsonpath='\''{.spec.versions[0].schema.openAPIV3Schema.properties.spec.required[0]}'\'' 2>/dev/null)" = '\''schedule'\'' ] && [ "$(kubectl get crd/backups.stable.example.com -o jsonpath='\''{.spec.versions[0].schema.openAPIV3Schema.properties.spec.properties.tier.enum[1]}'\'' 2>/dev/null)" = '\''pro'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
