#!/usr/bin/env bash
# KubeDrill lab pack: Map root in the container to a harmless host user (s166-user-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Map root in the container to a harmless host user"
kubectl create namespace userns --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: userns

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy
  namespace: userns
spec:
  replicas: 2
  selector:
    matchLabels:
      app: legacy
  template:
    metadata:
      labels:
        app: legacy
    spec:
      containers:
      - name: legacy
        image: nginx:1.25
        securityContext:
          runAsUser: 0

KUBEDRILL_EOF


kubectl config set-context --current --namespace=userns >/dev/null
echo "✔ Ready. Namespace: userns. Read README.md, fix the cluster, then run ./check.sh"
