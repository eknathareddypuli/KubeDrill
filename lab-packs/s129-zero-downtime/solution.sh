#!/usr/bin/env bash
# KubeDrill lab pack: Zero-downtime rollout: surge, readiness, preStop, PDB (s129-zero-downtime)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s129-zero-downtime. Try the lab first.
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: checkout-z
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      terminationGracePeriodSeconds: 45
      containers:
      - name: checkout
        image: nginx:1.25
        readinessProbe:
          httpGet:
            path: /
            port: 80
        lifecycle:
          preStop:
            exec:
              command: ["sleep", "10"]
EOF
kubectl create pdb checkout --selector=app=checkout --min-available=2 -n checkout-z
kubectl rollout status deployment/checkout -n checkout-z
