#!/usr/bin/env bash
# KubeDrill lab pack: Incident: the silent database (s92-silent-database)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s92-silent-database. Try the lab first.
kubectl delete pvc db-data -n data
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data
  namespace: data
spec:
  storageClassName: standard
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
EOF
kubectl create secret generic db-creds --from-literal=password=change-me -n data
kubectl patch networkpolicy db-lockdown -n data --type=json -p '[{"op":"add","path":"/spec/ingress/0/from/-","value":{"podSelector":{"matchLabels":{"app":"app"}}}}]'
kubectl get pods -n data
