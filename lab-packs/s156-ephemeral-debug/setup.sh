#!/usr/bin/env bash
# KubeDrill lab pack: Debug a shell-less pod with an ephemeral container (s156-ephemeral-debug)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Debug a shell-less pod with an ephemeral container"
kubectl create namespace dbg --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: dbg

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: dbg
  annotations:
    kubedrill/original: "yes"
spec:
  containers:
  - name: api
    image: registry.k8s.io/pause:3.9

KUBEDRILL_EOF


kubectl config set-context --current --namespace=dbg >/dev/null
echo "✔ Ready. Namespace: dbg. Read README.md, fix the cluster, then run ./check.sh"
