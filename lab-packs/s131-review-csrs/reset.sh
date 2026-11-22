#!/usr/bin/env bash
# KubeDrill lab pack: Pending CSRs: approve one, deny the dangerous one (s131-review-csrs)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace default --ignore-not-found
kubectl delete csr dev-ci old-laptop build-bot --ignore-not-found
