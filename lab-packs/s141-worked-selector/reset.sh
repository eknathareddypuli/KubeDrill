#!/usr/bin/env bash
# KubeDrill lab pack: Worked example: Service with no endpoints (watch, then do) (s141-worked-selector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace we-svc --ignore-not-found

