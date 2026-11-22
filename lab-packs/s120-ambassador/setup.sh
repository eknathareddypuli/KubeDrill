#!/usr/bin/env bash
# KubeDrill lab pack: Ambassador pattern: talk to localhost, let a proxy do the rest (s120-ambassador)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Ambassador pattern: talk to localhost, let a proxy do the rest"
kubectl create namespace ambassador --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: db-prod
  namespace: ambassador
spec:
  selector:
    app: db
  ports:
  - port: 5432
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  namespace: ambassador
spec:
  replicas: 1
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

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: ambassador
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
      - name: app
        image: nginx:1.25
        env:
        - name: DB_HOST
          value: db-prod
        - name: DB_PORT
          value: "5432"

KUBEDRILL_EOF


kubectl config set-context --current --namespace=ambassador >/dev/null
echo "✔ Ready. Namespace: ambassador. Read README.md, fix the cluster, then run ./check.sh"
