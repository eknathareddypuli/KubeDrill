#!/usr/bin/env bash
# KubeDrill lab pack: Hardening: an over-broad binding and the default ServiceAccount (s113-open-binding)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s113-open-binding. Try the lab first.
kubectl delete clusterrolebinding everyone-admin
kubectl patch sa default -n team -p '{"automountServiceAccountToken":false}'
kubectl get sa default -n team -o yaml
