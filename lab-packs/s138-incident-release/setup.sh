#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: release 42 broke `api` and `worker` (s138-incident-release)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: INCIDENT: release 42 broke `api` and `worker`"
kubectl create namespace inc-api --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: inc-api

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Secret
metadata:
  name: api-secret
  namespace: inc-api
stringData:
  password: s3cret

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: inc-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: nginx:1.25
        env:
        - name: DB_PASS
          valueFrom:
            secretKeyRef:
              name: api-secret
              key: db-password
        readinessProbe:
          httpGet:
            path: /
            port: 8081

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
  namespace: inc-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: polinux/stress
        command: ["stress"]
        args: ["--vm", "1", "--vm-bytes", "120M", "--vm-hang", "1"]
        resources:
          requests:
            memory: 64Mi
          limits:
            memory: 80Mi

KUBEDRILL_EOF


kubectl config set-context --current --namespace=inc-api >/dev/null
echo "✔ Ready. Namespace: inc-api. Read README.md, fix the cluster, then run ./check.sh"
