#!/usr/bin/env bash
# KubeDrill lab pack: CreateContainerConfigError: missing ConfigMap (s05-config-error)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s05-config-error. Try the lab first.
kubectl create configmap app-config --from-literal=LOG_LEVEL=debug
kubectl get pods
kubectl exec deploy/app -- printenv LOG_LEVEL
