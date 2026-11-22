#!/usr/bin/env bash
# KubeDrill lab pack: Gateway API: Gateway + HTTPRoute (s23-gateway-api)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s23-gateway-api. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public
  namespace: gw
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    port: 80
    protocol: HTTP
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-route
  namespace: gw
spec:
  parentRefs:
  - name: public
  hostnames: ["app.local"]
  rules:
  - backendRefs:
    - name: web
      port: 80
EOF
kubectl get gateway,httproute -n gw
