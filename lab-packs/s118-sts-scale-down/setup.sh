#!/usr/bin/env bash
# KubeDrill lab pack: StatefulSet scale-down: what happens to the volumes? (s118-sts-scale-down)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: StatefulSet scale-down: what happens to the volumes?"
kubectl create namespace ledger --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: db
  namespace: ledger
spec:
  clusterIP: None
  selector:
    app: db
  ports:
  - port: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
  namespace: ledger
spec:
  serviceName: db
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
      - name: db
        image: nginx:1.25
        volumeMounts:
        - {name: data, mountPath: /data}
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 1Gi

KUBEDRILL_EOF


kubectl config set-context --current --namespace=ledger >/dev/null
echo "✔ Ready. Namespace: ledger. Read README.md, fix the cluster, then run ./check.sh"
