#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: the tab character (s143-yaml-tab)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: YAML repair: the tab character"
kubectl create namespace yr-tab --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: yr-tab

KUBEDRILL_EOF

cat > "$HOME/tabby.yaml" <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tabby
  namespace: yr-tab
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tabby
  template:
    metadata:
      labels:
        app: tabby
    spec:
      containers:
	- name: c
	  image: nginx:1.25

KUBEDRILL_EOF
kubectl config set-context --current --namespace=yr-tab >/dev/null
echo "✔ Ready. Namespace: yr-tab. Read README.md, fix the cluster, then run ./check.sh"
