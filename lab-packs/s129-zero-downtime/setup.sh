#!/usr/bin/env bash
# KubeDrill lab pack: Zero-downtime rollout: surge, readiness, preStop, PDB (s129-zero-downtime)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Zero-downtime rollout: surge, readiness, preStop, PDB"
kubectl create namespace checkout-z --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: checkout-z
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
      - name: checkout
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: kd-noise

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-report
  namespace: kd-noise
  labels:
    kubedrill/noise: "true"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: legacy-report
  template:
    metadata:
      labels:
        app: legacy-report
    spec:
      containers:
      - name: report
        image: registry.example.com/legacy/report:9.9

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: reports-svc
  namespace: kd-noise
  labels:
    kubedrill/noise: "true"
spec:
  selector:
    app: reports-retired
  ports:
  - port: 80

KUBEDRILL_EOF


kubectl config set-context --current --namespace=checkout-z >/dev/null
echo "✔ Ready. Namespace: checkout-z. Read README.md, fix the cluster, then run ./check.sh"
