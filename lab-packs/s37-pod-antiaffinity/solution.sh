#!/usr/bin/env bash
# KubeDrill lab pack: Spread replicas with pod anti-affinity (s37-pod-antiaffinity)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s37-pod-antiaffinity. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: front
  namespace: spread
spec:
  replicas: 2
  selector:
    matchLabels:
      app: front
  template:
    metadata:
      labels:
        app: front
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: kubernetes.io/hostname
            labelSelector:
              matchLabels:
                app: front
      containers:
      - name: front
        image: nginx:1.25
EOF
kubectl get pods -n spread -o wide
