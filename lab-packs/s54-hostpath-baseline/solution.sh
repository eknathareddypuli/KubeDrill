#!/usr/bin/env bash
# KubeDrill lab pack: hostPath volume blocked by Pod Security (s54-hostpath-baseline)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s54-hostpath-baseline. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logger
  namespace: hp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: logger
  template:
    metadata:
      labels:
        app: logger
    spec:
      volumes:
      - name: logs
        emptyDir: {}
      containers:
      - name: logger
        image: nginx:1.25
        volumeMounts:
        - {name: logs, mountPath: /logs}
EOF
kubectl get pods -n hp
