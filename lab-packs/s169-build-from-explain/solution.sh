#!/usr/bin/env bash
# KubeDrill lab pack: Documentation lookup: build the object from explain, not from memory (s169-build-from-explain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s169-build-from-explain. Try the lab first.
kubectl explain pod.spec.topologySpreadConstraints
kubectl patch deployment web -n spread -p '{"spec":{"template":{"spec":{"topologySpreadConstraints":[{"maxSkew":1,"topologyKey":"kubernetes.io/hostname","whenUnsatisfiable":"DoNotSchedule","labelSelector":{"matchLabels":{"app":"web"}}}]}}}}'
kubectl rollout status deployment/web -n spread
