#!/usr/bin/env bash
# KubeDrill lab pack: AppArmor: write a profile and attach it with the current field (s152-apparmor)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: AppArmor: write a profile and attach it with the current field"
kubectl create namespace cks-aa --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: cks-aa

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: cks-aa
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
      annotations:
        container.apparmor.security.beta.kubernetes.io/c: runtime/default
    spec:
      containers:
      - name: c
        image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=cks-aa >/dev/null
echo "✔ Ready. Namespace: cks-aa. Read README.md, fix the cluster, then run ./check.sh"
