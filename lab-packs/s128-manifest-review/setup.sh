#!/usr/bin/env bash
# KubeDrill lab pack: Review a manifest: fix six production anti-patterns (s128-manifest-review)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Review a manifest: fix six production anti-patterns"
kubectl create namespace review --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Secret
metadata:
  name: orders-db
  namespace: review
stringData:
  password: hunter2

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-web
  namespace: review
spec:
  replicas: 1
  selector:
    matchLabels:
      app: orders-web
  template:
    metadata:
      labels:
        app: orders-web
    spec:
      containers:
      - name: web
        image: nginxinc/nginx-unprivileged:latest
        env:
        - name: DB_PASSWORD
          value: hunter2

KUBEDRILL_EOF


kubectl config set-context --current --namespace=review >/dev/null
echo "✔ Ready. Namespace: review. Read README.md, fix the cluster, then run ./check.sh"
