#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: wrong indentation (s144-yaml-indent)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s144-yaml-indent. Try the lab first.
cat > $HOME/webpod.yaml <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: webpod
  namespace: yr-indent
  labels:
    app: webpod
spec:
  containers:
  - name: web
    image: nginx:1.25
EOF
kubectl apply -f $HOME/webpod.yaml
