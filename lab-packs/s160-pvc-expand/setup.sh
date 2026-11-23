#!/usr/bin/env bash
# KubeDrill lab pack: Grow a bound PVC without losing data (s160-pvc-expand)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Grow a bound PVC without losing data"
kubectl create namespace data --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: data

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: slow
provisioner: rancher.io/local-path
volumeBindingMode: Immediate
reclaimPolicy: Delete

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data
  namespace: data
  annotations:
    kubedrill/original: "yes"
spec:
  storageClassName: slow
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: db
  namespace: data
spec:
  containers:
  - name: db
    image: nginx:1.25
    volumeMounts:
    - name: d
      mountPath: /var/lib/data
  volumes:
  - name: d
    persistentVolumeClaim:
      claimName: db-data

KUBEDRILL_EOF


kubectl config set-context --current --namespace=data >/dev/null
echo "✔ Ready. Namespace: data. Read README.md, fix the cluster, then run ./check.sh"
