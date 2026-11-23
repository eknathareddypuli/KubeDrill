#!/usr/bin/env bash
# KubeDrill lab pack: Grow a bound PVC without losing data (s160-pvc-expand)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s160-pvc-expand. Try the lab first.
kubectl patch pvc db-data -n data -p '{"spec":{"resources":{"requests":{"storage":"3Gi"}}}}'
kubectl patch sc slow -p '{"allowVolumeExpansion":true}'
kubectl patch pvc db-data -n data -p '{"spec":{"resources":{"requests":{"storage":"3Gi"}}}}'
kubectl get pvc -n data
