#!/usr/bin/env bash
# KubeDrill lab pack: Kustomize: override the image tag (s62-kustomize-images)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s62-kustomize-images. Try the lab first.
mkdir -p overlays/prod
cat > overlays/prod/kustomization.yaml <<EOF
resources:
- ../../base
namespace: img
images:
- name: nginx
  newTag: "1.25"
EOF
kubectl kustomize overlays/prod
kubectl apply -k overlays/prod
