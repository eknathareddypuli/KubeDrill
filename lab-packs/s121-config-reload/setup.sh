#!/usr/bin/env bash
# KubeDrill lab pack: Change config without a restart: volume vs env (s121-config-reload)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Change config without a restart: volume vs env"
kubectl create namespace reload --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: flags
  namespace: reload
data:
  FEATURE: "off"

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: reload
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
        env:
        - name: FEATURE
          valueFrom:
            configMapKeyRef:
              name: flags
              key: FEATURE

KUBEDRILL_EOF


kubectl config set-context --current --namespace=reload >/dev/null
echo "✔ Ready. Namespace: reload. Read README.md, fix the cluster, then run ./check.sh"
