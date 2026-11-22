#!/usr/bin/env bash
# KubeDrill lab pack: Worked example: missing ConfigMap (watch, then do) (s142-worked-configmap)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Worked example: missing ConfigMap (watch, then do)"
kubectl create namespace we-cfg --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: we-cfg

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo
  namespace: we-cfg
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
        env:
        - name: MODE
          valueFrom:
            configMapKeyRef:
              name: demo-cfg
              key: mode

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mine
  namespace: we-cfg
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
        env:
        - name: MODE
          valueFrom:
            configMapKeyRef:
              name: mine-cfg
              key: mode

KUBEDRILL_EOF


kubectl config set-context --current --namespace=we-cfg >/dev/null
echo "✔ Ready. Namespace: we-cfg. Read README.md, fix the cluster, then run ./check.sh"
