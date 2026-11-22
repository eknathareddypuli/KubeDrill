#!/usr/bin/env bash
# KubeDrill lab pack: DaemonSet only runs on one node (s42-daemonset-all-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s42-daemonset-all-nodes. Try the lab first.
kubectl delete ds logger -n agents
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: logger
  namespace: agents
spec:
  selector:
    matchLabels:
      app: logger
  template:
    metadata:
      labels:
        app: logger
    spec:
      containers:
      - name: logger
        image: busybox:1.36
        command: ["sleep", "3600"]
EOF
kubectl get pods -n agents -o wide
