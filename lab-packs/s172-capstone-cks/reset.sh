#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKS): harden the payments namespace (s172-capstone-cks)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace cap-cks --ignore-not-found

