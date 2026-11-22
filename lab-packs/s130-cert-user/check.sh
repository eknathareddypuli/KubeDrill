#!/usr/bin/env bash
# KubeDrill lab pack: Onboard a developer: client certificate, RBAC, kubeconfig (s130-cert-user)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Submit CSR `jane` (client-auth signer, 24h) and approve it'
chk 'Submit CSR `jane` (client-auth signer, 24h) and approve it' '[ "$(kubectl get csr/jane -o jsonpath='\''{.spec.signerName}'\'' 2>/dev/null)" = '\''kubernetes.io/kube-apiserver-client'\'' ] && [ "$(kubectl get csr/jane -o jsonpath='\''{.spec.expirationSeconds}'\'' 2>/dev/null)" = '\''86400'\'' ] && echo "$(kubectl get csr/jane -o jsonpath='\''{.status.certificate}'\'' 2>/dev/null)" | grep -Eq -- '\''.+'\'''
echo 'Task 2: Save the issued certificate as `jane.crt`'
chk 'Save the issued certificate as `jane.crt`' '[ -f "$HOME/jane.crt" ] && grep -Eq -- '\''^-----BEGIN CERTIFICATE-----'\'' "$HOME/jane.crt"'
echo 'Task 3: Give group `dev` read-only pods in `dev` (Role `pod-reader` already exists)'
chk 'Give group `dev` read-only pods in `dev` (Role `pod-reader` already exists)' '[ "$(kubectl auth can-i list pods --as=jane --as-group=dev -n dev 2>/dev/null)" = yes ] && [ "$(kubectl auth can-i get pods --as=jane --as-group=dev -n dev 2>/dev/null)" = yes ]'
echo 'Task 4: Add kubeconfig user `jane` and context `jane-dev` (namespace `dev`)'
chk 'Add kubeconfig user `jane` and context `jane-dev` (namespace `dev`)' 'kubectl config get-users | grep -qx '\''jane'\'' && kubectl config get-contexts -o name | grep -qx '\''jane-dev'\'' && [ "$(kubectl config view -o jsonpath='\''{.contexts[?(@.name=="jane-dev")].context.namespace}'\'')" = '\''dev'\'' ] && [ "$(kubectl config view -o jsonpath='\''{.contexts[?(@.name=="jane-dev")].context.user}'\'')" = '\''jane'\'' ]'
echo 'Constraint: Jane gets read-only pods in `dev` only: no other namespace, no Secrets, no deletes.'
chk 'Jane gets read-only pods in `dev` only: no other namespace, no Secrets, no deletes.' '[ "$(kubectl auth can-i list pods --as=jane --as-group=dev -n default 2>/dev/null)" = no ] && [ "$(kubectl auth can-i get secrets --as=jane --as-group=dev -n dev 2>/dev/null)" = no ] && [ "$(kubectl auth can-i delete pods --as=jane --as-group=dev -n dev 2>/dev/null)" = no ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
