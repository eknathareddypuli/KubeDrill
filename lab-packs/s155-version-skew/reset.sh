#!/usr/bin/env bash
# KubeDrill lab pack: Version skew: which components are out of policy? (s155-version-skew)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace default --ignore-not-found

