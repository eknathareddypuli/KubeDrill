#!/usr/bin/env bash
# KubeDrill lab pack: Quota and LimitRange: who spent the CPU? (s119-quota-limitrange)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Quota and LimitRange: who spent the CPU?"
kubectl create namespace team-b --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cpu-cap
  namespace: team-b
spec:
  hard:
    requests.cpu: "1"
    limits.cpu: "2"
    pods: "10"

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: team-b
spec:
  limits:
  - type: Container
    defaultRequest:
      cpu: 400m
    default:
      cpu: 500m

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: team-b
spec:
  replicas: 4
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

KUBEDRILL_EOF


kubectl config set-context --current --namespace=team-b >/dev/null
echo "✔ Ready. Namespace: team-b. Read README.md, fix the cluster, then run ./check.sh"
