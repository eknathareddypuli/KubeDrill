#!/usr/bin/env bash
# KubeDrill lab pack: Onboard a tenant namespace (s26-multitenant)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s26-multitenant. Try the lab first.
kubectl create namespace team-b
kubectl create quota team-quota --hard=pods=5 -n team-b
kubectl apply -f - <<EOF
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: team-b
spec:
  limits:
  - type: Container
    default:
      cpu: 200m
    defaultRequest:
      cpu: 100m
EOF
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: team-b
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF
kubectl run probe --image=nginx:1.25 -n team-b
