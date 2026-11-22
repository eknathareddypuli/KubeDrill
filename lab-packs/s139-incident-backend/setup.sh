#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: frontend cannot reach backend (three layers) (s139-incident-backend)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: INCIDENT: frontend cannot reach backend (three layers)"
kubectl create namespace inc-net --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: inc-net

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: inc-net
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: nginx:1.255

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: inc-net
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 8080

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: frontend
  namespace: inc-net
  labels:
    role: frontend
spec:
  containers:
  - name: frontend
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-egress
  namespace: inc-net
spec:
  podSelector:
    matchLabels:
      role: frontend
  policyTypes: ["Egress"]
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 80

KUBEDRILL_EOF


kubectl config set-context --current --namespace=inc-net >/dev/null
echo "✔ Ready. Namespace: inc-net. Read README.md, fix the cluster, then run ./check.sh"
