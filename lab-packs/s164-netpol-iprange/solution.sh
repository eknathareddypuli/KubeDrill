#!/usr/bin/env bash
# KubeDrill lab pack: NetworkPolicy: ipBlock and a port range (s164-netpol-iprange)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s164-netpol-iprange. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-range
  namespace: ranges
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - ipBlock:
        cidr: 10.244.0.0/16
    ports:
    - protocol: TCP
      port: 8080
      endPort: 8081
EOF
