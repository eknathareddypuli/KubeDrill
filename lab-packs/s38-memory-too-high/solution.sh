#!/usr/bin/env bash
# KubeDrill lab pack: Insufficient memory (s38-memory-too-high)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s38-memory-too-high. Try the lab first.
kubectl set resources deployment/report --requests=memory=128Mi -n mem
kubectl rollout status deployment/report -n mem
