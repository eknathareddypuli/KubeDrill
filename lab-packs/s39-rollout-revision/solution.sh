#!/usr/bin/env bash
# KubeDrill lab pack: Roll back to a specific revision (s39-rollout-revision)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s39-rollout-revision. Try the lab first.
kubectl rollout history deployment/shop -n rel
kubectl rollout undo deployment/shop --to-revision=1 -n rel
kubectl rollout status deployment/shop -n rel
