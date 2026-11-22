#!/usr/bin/env bash
# KubeDrill lab pack: StatefulSet: scale with stable storage (s14-statefulset-pvc)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s14-statefulset-pvc. Try the lab first.
kubectl scale statefulset kv --replicas=3
kubectl get pvc
