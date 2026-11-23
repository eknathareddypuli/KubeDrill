#!/usr/bin/env bash
# KubeDrill lab pack: Change the setting in an immutable ConfigMap (s161-immutable-config)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Change the setting in an immutable ConfigMap"
kubectl create namespace conf --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: conf

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-config-v1
  namespace: conf
immutable: true
data:
  LOG_LEVEL: info

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: conf
spec:
  replicas: 2
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
        envFrom:
        - configMapRef:
            name: web-config-v1

KUBEDRILL_EOF


kubectl config set-context --current --namespace=conf >/dev/null
echo "✔ Ready. Namespace: conf. Read README.md, fix the cluster, then run ./check.sh"
