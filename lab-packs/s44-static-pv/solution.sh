#!/usr/bin/env bash
# KubeDrill lab pack: Bind a PVC to a pre-created PersistentVolume (s44-static-pv)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s44-static-pv. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: archive
  namespace: pvs
spec:
  storageClassName: manual
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 2Gi
EOF
kubectl get pvc,pv -n pvs
