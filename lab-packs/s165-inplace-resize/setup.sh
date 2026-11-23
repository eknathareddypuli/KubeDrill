#!/usr/bin/env bash
# KubeDrill lab pack: Resize a running pod without restarting it (s165-inplace-resize)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Resize a running pod without restarting it"
kubectl create namespace resize --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: resize

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: worker
  namespace: resize
  annotations:
    kubedrill/original: "yes"
spec:
  containers:
  - name: worker
    image: nginx:1.25
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 100m
        memory: 128Mi
    resizePolicy:
    - resourceName: cpu
      restartPolicy: NotRequired

KUBEDRILL_EOF


kubectl config set-context --current --namespace=resize >/dev/null
echo "✔ Ready. Namespace: resize. Read README.md, fix the cluster, then run ./check.sh"
