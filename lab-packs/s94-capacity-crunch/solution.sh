#!/usr/bin/env bash
# KubeDrill lab pack: Incident: capacity crunch (s94-capacity-crunch)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s94-capacity-crunch. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: gold
value: 1000
EOF
kubectl set resources deploy/orders -n prod --requests=cpu=100m
kubectl uncordon worker1
kubectl get pods -n prod
