#!/usr/bin/env bash
# KubeDrill lab pack: Documentation lookup: find the field in kubectl explain (s167-explain-lookup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace default --ignore-not-found

