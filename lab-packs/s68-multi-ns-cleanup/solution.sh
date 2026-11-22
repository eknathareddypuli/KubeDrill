#!/usr/bin/env bash
# KubeDrill lab pack: Clean up temporary namespaces by label (s68-multi-ns-cleanup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s68-multi-ns-cleanup. Try the lab first.
kubectl get ns -l env=temp
kubectl delete ns -l env=temp
kubectl get deploy -n prod
