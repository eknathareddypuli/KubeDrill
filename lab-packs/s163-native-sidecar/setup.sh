#!/usr/bin/env bash
# KubeDrill lab pack: Make the log shipper a native sidecar (s163-native-sidecar)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Make the log shipper a native sidecar"
kubectl create namespace side --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: side

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop
  namespace: side
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shop
  template:
    metadata:
      labels:
        app: shop
    spec:
      containers:
      - name: app
        image: nginx:1.25
      - name: shipper
        image: busybox:1.36
        command: ["sh", "-c", "sleep 3600"]

KUBEDRILL_EOF


kubectl config set-context --current --namespace=side >/dev/null
echo "✔ Ready. Namespace: side. Read README.md, fix the cluster, then run ./check.sh"
