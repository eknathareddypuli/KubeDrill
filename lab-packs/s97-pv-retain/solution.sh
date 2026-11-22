#!/usr/bin/env bash
# KubeDrill lab pack: Storage: keep the data, allow expansion (s97-pv-retain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s97-pv-retain. Try the lab first.
kubectl patch pv pv-reports -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
kubectl patch sc fast -p '{"allowVolumeExpansion":true}'
kubectl patch pvc reports -n store -p '{"spec":{"resources":{"requests":{"storage":"2Gi"}}}}'
kubectl get pv,pvc -A
