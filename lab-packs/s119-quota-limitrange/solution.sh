#!/usr/bin/env bash
# KubeDrill lab pack: Quota and LimitRange: who spent the CPU? (s119-quota-limitrange)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s119-quota-limitrange. Try the lab first.
kubectl describe quota -n team-b
kubectl patch limitrange defaults -n team-b --type=json -p '[{"op":"replace","path":"/spec/limits/0/defaultRequest/cpu","value":"100m"}]'
kubectl rollout restart deployment/web -n team-b
kubectl rollout status deployment/web -n team-b
