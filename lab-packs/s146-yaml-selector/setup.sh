#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: selector that matches nothing (s146-yaml-selector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: YAML repair: selector that matches nothing"
kubectl create namespace yr-sel --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: yr-sel

KUBEDRILL_EOF

cat > "$HOME/site.yaml" <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: site
  namespace: yr-sel
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: site
    spec:
      containers:
      - name: c
        image: nginx:1.25

KUBEDRILL_EOF
kubectl config set-context --current --namespace=yr-sel >/dev/null
echo "✔ Ready. Namespace: yr-sel. Read README.md, fix the cluster, then run ./check.sh"
