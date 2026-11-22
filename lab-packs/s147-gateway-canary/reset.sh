#!/usr/bin/env bash
# KubeDrill lab pack: Gateway API: header routing and a 90/10 split (s147-gateway-canary)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace gw3 --ignore-not-found

