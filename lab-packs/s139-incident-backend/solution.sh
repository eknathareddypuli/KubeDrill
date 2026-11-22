#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: frontend cannot reach backend (three layers) (s139-incident-backend)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s139-incident-backend. Try the lab first.
kubectl set image deployment/backend backend=nginx:1.25 -n inc-net
kubectl patch svc backend -n inc-net --type=json -p='[{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'
kubectl apply -f - <<'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-dns
  namespace: inc-net
spec:
  podSelector:
    matchLabels:
      role: frontend
  policyTypes: ["Egress"]
  egress:
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
kubectl exec frontend -n inc-net -- wget -qO- -T 2 backend
