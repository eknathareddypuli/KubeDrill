#!/usr/bin/env bash
# KubeDrill lab pack: LimitRange rejects the pod (s47-limitrange-max)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s47-limitrange-max. Try the lab first.
kubectl get events -n lr
kubectl set resources deployment/heavy --requests=cpu=200m --limits=cpu=400m -n lr
kubectl rollout status deployment/heavy -n lr
