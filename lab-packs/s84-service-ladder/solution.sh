#!/usr/bin/env bash
# KubeDrill lab pack: Service unreachable: climb the ladder (s84-service-ladder)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s84-service-ladder. Try the lab first.
kubectl patch svc web -n store --type=json -p '[{"op":"replace","path":"/spec/selector/app","value":"web"},{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-tester
  namespace: store
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          run: tester
EOF
kubectl exec tester -n store -- wget -qO- web
