#!/usr/bin/env bash
# KubeDrill lab pack: Worked example: missing ConfigMap (watch, then do) (s142-worked-configmap)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s142-worked-configmap. Try the lab first.
kubectl describe pod -n we-cfg -l app=mine
kubectl create configmap mine-cfg --from-literal=mode=live -n we-cfg
kubectl get pods -n we-cfg -l app=mine
