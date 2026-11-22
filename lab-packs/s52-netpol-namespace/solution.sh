#!/usr/bin/env bash
# KubeDrill lab pack: NetworkPolicy: allow only a labelled namespace (s52-netpol-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s52-netpol-namespace. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-from-prod
  namespace: data
spec:
  podSelector:
    matchLabels:
      app: db
  policyTypes: [Ingress]
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          env: prod
    ports:
    - protocol: TCP
      port: 80
EOF
kubectl exec -n other tester -- wget -qO- -T 2 db.data
