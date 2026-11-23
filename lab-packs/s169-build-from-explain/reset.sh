#!/usr/bin/env bash
# KubeDrill lab pack: Documentation lookup: build the object from explain, not from memory (s169-build-from-explain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace spread --ignore-not-found

