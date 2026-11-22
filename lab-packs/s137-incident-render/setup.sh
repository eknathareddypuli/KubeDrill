#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: render workers will not run (leave the sick node alone) (s137-incident-render)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: INCIDENT: render workers will not run (leave the sick node alone)"
kubectl create namespace inc-render --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: inc-render

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ResourceQuota
metadata:
  name: render-pods
  namespace: inc-render
spec:
  hard:
    pods: "2"

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: render
  namespace: inc-render
spec:
  replicas: 3
  selector:
    matchLabels:
      app: render
  template:
    metadata:
      labels:
        app: render
    spec:
      nodeSelector:
        disk: ssd
      containers:
      - name: render
        image: nginx:1.25
        resources:
          requests:
            cpu: 100m
            memory: 32Mi

KUBEDRILL_EOF
kubectl cordon worker1
kubectl cordon worker2

kubectl config set-context --current --namespace=inc-render >/dev/null
echo "✔ Ready. Namespace: inc-render. Read README.md, fix the cluster, then run ./check.sh"
