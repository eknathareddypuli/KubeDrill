#!/usr/bin/env bash
# KubeDrill lab pack: NoExecute taint: evict, but spare the critical pod (s99-noexecute-eviction)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s99-noexecute-eviction. Try the lab first.
kubectl patch deployment payments -n edge -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"retire","operator":"Equal","value":"true","effect":"NoExecute","tolerationSeconds":300}]}}}}'
kubectl taint nodes worker2 retire=true:NoExecute
kubectl get pods -n edge -o wide
