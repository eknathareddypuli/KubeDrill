#!/usr/bin/env bash
# KubeDrill lab pack: Worked example: ImagePullBackOff (watch, then do) (s140-worked-imagepull)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Worked example: ImagePullBackOff (watch, then do)"
kubectl create namespace we-image --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: we-image

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo
  namespace: we-image
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
        image: nginx:1.255

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mine
  namespace: we-image
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
        image: nginx:1.266

KUBEDRILL_EOF


kubectl config set-context --current --namespace=we-image >/dev/null
echo "✔ Ready. Namespace: we-image. Read README.md, fix the cluster, then run ./check.sh"
