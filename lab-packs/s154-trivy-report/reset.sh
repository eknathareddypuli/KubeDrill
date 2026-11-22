#!/usr/bin/env bash
# KubeDrill lab pack: Read a Trivy report: what must be fixed first (s154-trivy-report)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace default --ignore-not-found

