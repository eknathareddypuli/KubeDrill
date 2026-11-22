#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: wrong indentation (s144-yaml-indent)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: YAML repair: wrong indentation"
kubectl create namespace yr-indent --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: yr-indent

KUBEDRILL_EOF

cat > "$HOME/webpod.yaml" <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: webpod
  namespace: yr-indent
  labels:
    app: webpod
spec:
  containers:
  - name: web
  image: nginx:1.25

KUBEDRILL_EOF
kubectl config set-context --current --namespace=yr-indent >/dev/null
echo "✔ Ready. Namespace: yr-indent. Read README.md, fix the cluster, then run ./check.sh"
