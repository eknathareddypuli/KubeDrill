#!/usr/bin/env bash
# KubeDrill lab pack: Service reachable but requests fail: wrong targetPort (s29-svc-targetport)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s29-svc-targetport. Try the lab first.
kubectl get svc api -o yaml
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: route
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 80
EOF
kubectl exec tester -- wget -qO- -T 2 api
