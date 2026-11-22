#!/usr/bin/env bash
# KubeDrill lab pack: Gateway API: header routing and a 90/10 split (s147-gateway-canary)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s147-gateway-canary. Try the lab first.
kubectl apply -f - <<'EOF'
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
  namespace: gw3
spec:
  parentRefs:
  - name: public
  hostnames: ["shop.local"]
  rules:
  - matches:
    - headers:
      - name: x-canary
        value: "true"
    backendRefs:
    - name: shop-v2
      port: 80
  - backendRefs:
    - name: shop-v1
      port: 80
      weight: 90
    - name: shop-v2
      port: 80
      weight: 10
EOF
kubectl get httproute shop -n gw3 -o yaml
