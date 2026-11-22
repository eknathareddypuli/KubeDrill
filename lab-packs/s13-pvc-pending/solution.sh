#!/usr/bin/env bash
# KubeDrill lab pack: PVC stuck Pending (s13-pvc-pending)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s13-pvc-pending. Try the lab first.
kubectl delete pvc store-data --wait=false
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: store-data
  namespace: data
spec:
  storageClassName: standard
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
EOF
