#!/usr/bin/env bash
# KubeDrill lab pack: One directory from a ConfigMap, a Secret and the Downward API (s162-projected-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: One directory from a ConfigMap, a Secret and the Downward API"
kubectl create namespace proj --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: proj

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: agent-config
  namespace: proj
data:
  agent.conf: "interval=30"

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Secret
metadata:
  name: agent-token
  namespace: proj
stringData:
  token: abc123

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent
  namespace: proj
spec:
  replicas: 1
  selector:
    matchLabels:
      app: agent
  template:
    metadata:
      labels:
        app: agent
        tier: edge
    spec:
      containers:
      - name: agent
        image: nginx:1.25
        volumeMounts:
        - name: cfg
          mountPath: /etc/agent
      volumes:
      - name: cfg
        configMap:
          name: agent-config

KUBEDRILL_EOF


kubectl config set-context --current --namespace=proj >/dev/null
echo "✔ Ready. Namespace: proj. Read README.md, fix the cluster, then run ./check.sh"
