#!/usr/bin/env bash
# KubeDrill lab pack: NetworkPolicy egress: allow only the API (s51-netpol-egress)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s51-netpol-egress. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: client-to-api
  namespace: eg
spec:
  podSelector:
    matchLabels:
      role: client
  policyTypes: [Egress]
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: api
    ports:
    - protocol: TCP
      port: 80
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
EOF
kubectl exec client -n eg -- wget -qO- -T 2 admin
