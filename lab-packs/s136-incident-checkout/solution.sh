#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: checkout is down (four faults, one symptom) (s136-incident-checkout)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s136-incident-checkout. Try the lab first.
kubectl get pods -n inc-checkout
kubectl set image deployment/checkout checkout=nginx:1.25 -n inc-checkout
kubectl create configmap checkout-cfg --from-literal=mode=live -n inc-checkout
kubectl patch svc checkout -n inc-checkout --type=merge -p '{"spec":{"selector":{"app":"checkout"}}}'
kubectl apply -f - <<'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-tester-to-checkout
  namespace: inc-checkout
spec:
  podSelector:
    matchLabels:
      app: checkout
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          run: tester
    ports:
    - protocol: TCP
      port: 80
EOF
kubectl exec tester -n inc-checkout -- wget -qO- -T 2 checkout
