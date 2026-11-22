#!/usr/bin/env bash
# KubeDrill lab pack: Worked example: ImagePullBackOff (watch, then do) (s140-worked-imagepull)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s140-worked-imagepull. Try the lab first.
kubectl get pods -n we-image -l app=mine
kubectl describe pod -n we-image -l app=mine
kubectl set image deployment/mine c=nginx:1.25 -n we-image
kubectl rollout status deployment/mine -n we-image
