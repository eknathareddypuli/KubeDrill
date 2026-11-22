#!/usr/bin/env bash
# KubeDrill lab pack: Gateway API: cross-namespace backend needs a ReferenceGrant (s148-gateway-referencegrant)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace web --ignore-not-found

