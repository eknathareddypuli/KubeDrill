#!/usr/bin/env bash
# KubeDrill lab pack: Rollout strategy: never lose capacity (s107-rolling-strategy)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s107-rolling-strategy. Try the lab first.
kubectl patch deployment api -n rolls -p '{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}'
kubectl set image deployment/api api=nginx:1.26 -n rolls
kubectl rollout status deployment/api -n rolls
