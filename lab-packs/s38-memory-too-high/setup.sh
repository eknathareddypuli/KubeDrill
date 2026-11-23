#!/usr/bin/env bash
# KubeDrill lab pack: Insufficient memory (s38-memory-too-high)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Insufficient memory"
kubectl create namespace mem --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: report
  namespace: mem
spec:
  replicas: 2
  selector:
    matchLabels:
      app: report
  template:
    metadata:
      labels:
        app: report
    spec:
      containers:
      - name: report
        image: nginx:1.25
        resources:
          requests:
            memory: 64Gi

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: kd-noise

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-agent-old
  namespace: kd-noise
  labels:
    kubedrill/noise: "true"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: metrics-agent-old
  template:
    metadata:
      labels:
        app: metrics-agent-old
    spec:
      containers:
      - name: agent
        image: nginx:1.25
        command: ["sh", "-c", "echo agent v1 is retired; exit 1"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: nightly-export
  namespace: kd-noise
  labels:
    kubedrill/noise: "true"
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: export
        image: busybox:1.36
        command: ["sh", "-c", "echo export failed: upstream timeout >&2; exit 2"]

KUBEDRILL_EOF


kubectl config set-context --current --namespace=mem >/dev/null
echo "✔ Ready. Namespace: mem. Read README.md, fix the cluster, then run ./check.sh"
