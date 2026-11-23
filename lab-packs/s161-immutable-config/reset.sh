#!/usr/bin/env bash
# KubeDrill lab pack: Change the setting in an immutable ConfigMap (s161-immutable-config)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace conf --ignore-not-found

