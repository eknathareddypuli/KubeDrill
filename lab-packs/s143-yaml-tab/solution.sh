#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: the tab character (s143-yaml-tab)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s143-yaml-tab. Try the lab first.
cat > $HOME/tabby.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tabby
  namespace: yr-tab
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tabby
  template:
    metadata:
      labels:
        app: tabby
    spec:
      containers:
      - name: c
        image: nginx:1.25
EOF
kubectl apply -f $HOME/tabby.yaml
