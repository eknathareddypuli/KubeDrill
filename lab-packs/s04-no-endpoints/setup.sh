#!/usr/bin/env bash
# KubeDrill lab pack: Service has no endpoints (s04-no-endpoints)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Service has no endpoints"
kubectl create namespace store --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: store
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
  namespace: store
spec:
  selector:
    app: front-end
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: tester
  namespace: store
  labels:
    run: tester
spec:
  containers:
  - name: tester
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: kd-noise

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


kubectl config set-context --current --namespace=store >/dev/null
echo "✔ Ready. Namespace: store. Read README.md, fix the cluster, then run ./check.sh"
