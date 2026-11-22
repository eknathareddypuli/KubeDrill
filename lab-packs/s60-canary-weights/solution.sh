#!/usr/bin/env bash
# KubeDrill lab pack: Canary release: 20% of traffic via replica ratio (s60-canary-weights)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s60-canary-weights. Try the lab first.
kubectl scale deployment canary --replicas=1 -n can
kubectl scale deployment stable --replicas=4 -n can
kubectl get endpoints shop -n can
