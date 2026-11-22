#!/usr/bin/env bash
# KubeDrill lab pack: Rotate a Secret and restart the workload (s56-rollout-restart-secret)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s56-rollout-restart-secret. Try the lab first.
kubectl delete secret db-creds -n rot
kubectl create secret generic db-creds --from-literal=password=rotated -n rot
kubectl rollout restart deployment/app -n rot
kubectl rollout status deployment/app -n rot
