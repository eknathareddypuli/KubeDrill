#!/usr/bin/env bash
# KubeDrill lab pack: Your deployment is rejected by an admission policy (s159-vap-rejected)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace teamx --ignore-not-found

