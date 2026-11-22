#!/usr/bin/env bash
# KubeDrill lab pack: Pod Security (baseline) rejects a privileged pod (s53-psa-baseline)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s53-psa-baseline. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent
  namespace: base
spec:
  replicas: 2
  selector:
    matchLabels:
      app: agent
  template:
    metadata:
      labels:
        app: agent
    spec:
      containers:
      - name: agent
        image: nginx:1.25
EOF
kubectl get pods -n base
