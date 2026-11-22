#!/usr/bin/env bash
# KubeDrill lab pack: Zero-downtime rollout: surge, readiness, preStop, PDB (s129-zero-downtime)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace checkout-z --ignore-not-found

