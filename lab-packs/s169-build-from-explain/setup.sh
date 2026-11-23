#!/usr/bin/env bash
# KubeDrill lab pack: Documentation lookup: build the object from explain, not from memory (s169-build-from-explain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Documentation lookup: build the object from explain, not from memory"
kubectl create namespace spread --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: spread

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: spread
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
        image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=spread >/dev/null
echo "✔ Ready. Namespace: spread. Read README.md, fix the cluster, then run ./check.sh"
