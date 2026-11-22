#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: checkout is down (four faults, one symptom) (s136-incident-checkout)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: INCIDENT: checkout is down (four faults, one symptom)"
kubectl create namespace inc-checkout --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: inc-checkout

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: inc-checkout
spec:
  replicas: 2
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
      - name: checkout
        image: nginx:1.255
        env:
        - name: CHECKOUT_MODE
          valueFrom:
            configMapKeyRef:
              name: checkout-cfg
              key: mode

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: checkout
  namespace: inc-checkout
spec:
  selector:
    app: checkout-v2
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: inc-checkout
spec:
  podSelector: {}
  policyTypes: ["Ingress"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: tester
  namespace: inc-checkout
  labels:
    run: tester
spec:
  containers:
  - name: tester
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF


kubectl config set-context --current --namespace=inc-checkout >/dev/null
echo "✔ Ready. Namespace: inc-checkout. Read README.md, fix the cluster, then run ./check.sh"
