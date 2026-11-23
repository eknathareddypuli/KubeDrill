#!/usr/bin/env bash
# KubeDrill lab pack: NetworkPolicy: ipBlock and a port range (s164-netpol-iprange)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: NetworkPolicy: ipBlock and a port range"
kubectl create namespace ranges --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: ranges

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: ranges
  labels:
    app: api
spec:
  containers:
  - name: p1
    image: busybox:1.36
    command: ["httpd", "-f", "-p", "8080", "-h", "/tmp"]
  - name: p2
    image: busybox:1.36
    command: ["httpd", "-f", "-p", "8081", "-h", "/tmp"]
  - name: p3
    image: busybox:1.36
    command: ["httpd", "-f", "-p", "8090", "-h", "/tmp"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: tester
  namespace: ranges
spec:
  containers:
  - name: t
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: api-8080
  namespace: ranges
spec:
  selector:
    app: api
  ports:
  - port: 8080
    targetPort: 8080

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: api-8081
  namespace: ranges
spec:
  selector:
    app: api
  ports:
  - port: 8081
    targetPort: 8081

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: api-8090
  namespace: ranges
spec:
  selector:
    app: api
  ports:
  - port: 8090
    targetPort: 8090

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: ranges
spec:
  podSelector: {}
  policyTypes: ["Ingress"]

KUBEDRILL_EOF


kubectl config set-context --current --namespace=ranges >/dev/null
echo "✔ Ready. Namespace: ranges. Read README.md, fix the cluster, then run ./check.sh"
