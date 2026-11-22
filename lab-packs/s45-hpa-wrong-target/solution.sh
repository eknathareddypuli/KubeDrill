#!/usr/bin/env bash
# KubeDrill lab pack: HPA points at the wrong Deployment (s45-hpa-wrong-target)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s45-hpa-wrong-target. Try the lab first.
kubectl delete hpa checkout -n scale
kubectl autoscale deployment checkout --name=checkout --min=2 --max=5 --cpu-percent=60 -n scale
kubectl get hpa -n scale
