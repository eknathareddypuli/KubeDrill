#!/usr/bin/env bash
# KubeDrill lab pack: Gateway API: cross-namespace backend needs a ReferenceGrant (s148-gateway-referencegrant)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s148-gateway-referencegrant. Try the lab first.
kubectl patch httproute api -n web --type=json -p '[{"op":"add","path":"/spec/rules/0/backendRefs/0/namespace","value":"data"}]'
kubectl apply -f - <<'EOF'
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-web-routes
  namespace: data
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: web
  to:
  - group: ""
    kind: Service
    name: api
EOF
kubectl get referencegrant -n data
