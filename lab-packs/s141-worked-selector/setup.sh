#!/usr/bin/env bash
# KubeDrill lab pack: Worked example: Service with no endpoints (watch, then do) (s141-worked-selector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Worked example: Service with no endpoints (watch, then do)"
kubectl create namespace we-svc --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: we-svc

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo
  namespace: we-svc
spec:
  replicas: 2
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
      - name: c
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mine
  namespace: we-svc
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mine
  template:
    metadata:
      labels:
        app: mine
    spec:
      containers:
      - name: c
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: demo
  namespace: we-svc
spec:
  selector:
    app: demo-v2
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: mine
  namespace: we-svc
spec:
  selector:
    app: mine-v2
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF


kubectl config set-context --current --namespace=we-svc >/dev/null
echo "✔ Ready. Namespace: we-svc. Read README.md, fix the cluster, then run ./check.sh"
