#!/usr/bin/env bash
# KubeDrill lab pack: CrashLoopBackOff: OOMKilled (s03-oomkilled)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s03-oomkilled. Try the lab first.
kubectl set resources deployment/worker --limits=memory=256Mi
kubectl rollout status deployment/worker
