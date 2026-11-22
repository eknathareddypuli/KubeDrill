#!/usr/bin/env bash
# KubeDrill lab pack: Gateway API: header routing and a 90/10 split (s147-gateway-canary)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Gateway API: header routing and a 90/10 split"
kubectl create namespace gw3 --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: gw3

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-v1
  namespace: gw3
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shop-v1
  template:
    metadata:
      labels:
        app: shop-v1
    spec:
      containers:
      - name: c
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-v2
  namespace: gw3
spec:
  replicas: 1
  selector:
    matchLabels:
      app: shop-v2
  template:
    metadata:
      labels:
        app: shop-v2
    spec:
      containers:
      - name: c
        image: nginx:1.26

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: shop-v1
  namespace: gw3
spec:
  selector:
    app: shop-v1
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: shop-v2
  namespace: gw3
spec:
  selector:
    app: shop-v2
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public
  namespace: gw3
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    port: 80
    protocol: HTTP
    allowedRoutes:
      namespaces:
        from: All

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
  namespace: gw3
spec:
  parentRefs:
  - name: public
  hostnames: ["shop.local"]
  rules:
  - backendRefs:
    - name: shop-v1
      port: 80

KUBEDRILL_EOF


kubectl config set-context --current --namespace=gw3 >/dev/null
echo "✔ Ready. Namespace: gw3. Read README.md, fix the cluster, then run ./check.sh"
