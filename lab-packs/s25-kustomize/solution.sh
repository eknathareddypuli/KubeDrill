#!/usr/bin/env bash
# KubeDrill lab pack: Kustomize: base + prod overlay (s25-kustomize)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s25-kustomize. Try the lab first.
mkdir -p overlays/prod
cat > overlays/prod/kustomization.yaml <<EOF
resources:
- ../../base
namePrefix: prod-
namespace: shop
replicas:
- name: web
  count: 3
EOF
kubectl kustomize overlays/prod
kubectl apply -k overlays/prod
