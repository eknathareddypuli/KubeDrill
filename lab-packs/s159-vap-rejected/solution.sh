#!/usr/bin/env bash
# KubeDrill lab pack: Your deployment is rejected by an admission policy (s159-vap-rejected)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s159-vap-rejected. Try the lab first.
kubectl apply -f $HOME/web.yaml
cat > $HOME/web.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: teamx
  labels:
    owner: teamx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: registry.k8s.io/pause:3.9
EOF
kubectl apply -f $HOME/web.yaml
