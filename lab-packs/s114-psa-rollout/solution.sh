#!/usr/bin/env bash
# KubeDrill lab pack: Pod Security: warn and audit before you enforce (s114-psa-rollout)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s114-psa-rollout. Try the lab first.
kubectl label ns rollout-ns pod-security.kubernetes.io/enforce=baseline pod-security.kubernetes.io/warn=restricted pod-security.kubernetes.io/audit=restricted
kubectl get ns rollout-ns --show-labels
