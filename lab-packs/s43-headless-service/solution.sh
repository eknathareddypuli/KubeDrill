#!/usr/bin/env bash
# KubeDrill lab pack: StatefulSet needs a headless Service (s43-headless-service)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s43-headless-service. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: store-hl
  namespace: ss
spec:
  clusterIP: None
  selector:
    app: store
  ports:
  - port: 80
EOF
kubectl get endpoints store-hl -n ss
