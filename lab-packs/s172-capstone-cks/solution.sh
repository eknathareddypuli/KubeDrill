#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKS): harden the payments namespace (s172-capstone-cks)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s172-capstone-cks. Try the lab first.
kubectl delete pod debug-tools -n cap-cks --wait=false
kubectl delete clusterrolebinding cap-default-admin
kubectl patch deployment pay -n cap-cks --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/image","value":"nginxinc/nginx-unprivileged:1.25"},{"op":"replace","path":"/spec/template/spec/containers/0/securityContext","value":{"runAsNonRoot":true,"runAsUser":101,"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}}},{"op":"add","path":"/spec/template/spec/securityContext","value":{"seccompProfile":{"type":"RuntimeDefault"}}},{"op":"add","path":"/spec/template/spec/automountServiceAccountToken","value":false},{"op":"remove","path":"/spec/template/spec/containers/0/env"},{"op":"add","path":"/spec/template/spec/containers/0/volumeMounts","value":[{"name":"key","mountPath":"/etc/pay","readOnly":true}]},{"op":"add","path":"/spec/template/spec/volumes","value":[{"name":"key","secret":{"secretName":"pay-key"}}]},{"op":"add","path":"/spec/template/spec/containers/0/resources","value":{"requests":{"cpu":"50m","memory":"32Mi"},"limits":{"cpu":"200m","memory":"128Mi"}}}]'
kubectl label namespace cap-cks pod-security.kubernetes.io/enforce=restricted
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: cap-cks
spec:
  podSelector: {}
  policyTypes: ["Ingress"]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-gateway
  namespace: cap-cks
spec:
  podSelector:
    matchLabels:
      app: pay
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: gateway
EOF
kubectl apply -f - <<EOF
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: pin-images-cks
spec:
  policyName: pin-images
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: cap-cks
EOF
