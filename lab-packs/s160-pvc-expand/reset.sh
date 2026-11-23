#!/usr/bin/env bash
# KubeDrill lab pack: Grow a bound PVC without losing data (s160-pvc-expand)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace data --ignore-not-found

