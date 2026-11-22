#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: removed apiVersion (s145-yaml-apiversion)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: YAML repair: removed apiVersion"
kubectl create namespace yr-api --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: yr-api

KUBEDRILL_EOF

cat > "$HOME/legacy.yaml" <<'KUBEDRILL_EOF'
apiVersion: apps/v1beta1
kind: Deployment
metadata:
  name: legacy
  namespace: yr-api
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
      - name: c
        image: nginx:1.25

KUBEDRILL_EOF
kubectl config set-context --current --namespace=yr-api >/dev/null
echo "✔ Ready. Namespace: yr-api. Read README.md, fix the cluster, then run ./check.sh"
