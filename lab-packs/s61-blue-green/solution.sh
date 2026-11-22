#!/usr/bin/env bash
# KubeDrill lab pack: Blue/green switch by Service selector (s61-blue-green)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s61-blue-green. Try the lab first.
kubectl patch svc live -n bg -p '{"spec":{"selector":{"track":"green"}}}'
kubectl scale deployment blue --replicas=0 -n bg
kubectl get endpoints live -n bg
