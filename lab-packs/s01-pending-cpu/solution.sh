#!/usr/bin/env bash
# KubeDrill lab pack: Prod is down: pods stuck in Pending (s01-pending-cpu)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s01-pending-cpu. Try the lab first.
kubectl describe pod -l app=api | grep -A3 Events
kubectl set resources deployment/api --requests=cpu=100m,memory=64Mi
kubectl rollout status deployment/api
