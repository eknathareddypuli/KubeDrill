#!/usr/bin/env bash
# KubeDrill lab pack: Bad rollout: undo, scale, then upgrade (s06-rollout-rollback)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s06-rollout-rollback. Try the lab first.
kubectl rollout undo deployment/site
kubectl scale deployment/site --replicas=4
kubectl set image deployment/site site=nginx:1.27
kubectl rollout status deployment/site
