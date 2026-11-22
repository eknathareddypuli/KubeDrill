#!/usr/bin/env bash
# KubeDrill lab pack: Worked example: missing ConfigMap (watch, then do) (s142-worked-configmap)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace we-cfg --ignore-not-found

