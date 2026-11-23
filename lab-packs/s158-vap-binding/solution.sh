#!/usr/bin/env bash
# KubeDrill lab pack: An admission policy that does nothing: add the binding (s158-vap-binding)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s158-vap-binding. Try the lab first.
kubectl get validatingadmissionpolicy
kubectl apply -f - <<EOF
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: no-latest-prod
spec:
  policyName: no-latest
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        env: prod
EOF
